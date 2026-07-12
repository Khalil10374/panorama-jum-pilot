from datetime import datetime
from pathlib import Path
import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.engine import make_url

from src.core.security import require_roles
from src.core.settings import get_settings
from src.db.session import engine


router = APIRouter(prefix="/backups", tags=["backups"])
BACKUP_DIR = Path("backups")


def _require_sqlite_database() -> Path:
    settings = get_settings()
    url = make_url(settings.database_url)
    if not url.drivername.startswith("sqlite"):
        raise HTTPException(status_code=400, detail="Automatic file backups are only available for SQLite databases")
    if not url.database or url.database == ":memory:":
        raise HTTPException(status_code=400, detail="SQLite memory databases cannot be backed up")
    db_path = Path(url.database)
    if not db_path.is_absolute():
        db_path = Path.cwd() / db_path
    db_path = db_path.resolve()
    if not db_path.exists():
        raise HTTPException(status_code=404, detail="Database file was not found")
    return db_path


def _backup_path(filename: str) -> Path:
    path = (BACKUP_DIR / filename).resolve()
    backup_root = BACKUP_DIR.resolve()
    if path.parent != backup_root or path.suffix != ".db":
        raise HTTPException(status_code=404, detail="Backup not found")
    return path


def _serialize_backup(path: Path) -> dict:
    stat = path.stat()
    return {
        "filename": path.name,
        "size": stat.st_size,
        "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(timespec="seconds"),
        "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
    }


@router.get("")
def list_backups(_current_user=Depends(require_roles("Super Admin"))):
    BACKUP_DIR.mkdir(exist_ok=True)
    backups = sorted(BACKUP_DIR.glob("*.db"), key=lambda item: item.stat().st_mtime, reverse=True)
    return {"items": [_serialize_backup(path) for path in backups]}


@router.post("")
def create_backup(_current_user=Depends(require_roles("Super Admin"))):
    source = _require_sqlite_database()
    BACKUP_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    destination = BACKUP_DIR / f"panorama-jum-backup-{timestamp}.db"

    _copy_sqlite_database(source, destination)
    return _serialize_backup(destination)


def _copy_sqlite_database(source: Path, destination: Path):
    source_connection = sqlite3.connect(source)
    try:
        backup_connection = sqlite3.connect(destination)
        try:
            source_connection.backup(backup_connection)
        finally:
            backup_connection.close()
    finally:
        source_connection.close()


@router.get("/{filename}/download")
def download_backup(filename: str, _current_user=Depends(require_roles("Super Admin"))):
    path = _backup_path(filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Backup not found")
    return FileResponse(path, media_type="application/octet-stream", filename=path.name)


@router.post("/{filename}/restore")
def restore_backup(filename: str, _current_user=Depends(require_roles("Super Admin"))):
    source = _backup_path(filename)
    if not source.exists():
        raise HTTPException(status_code=404, detail="Backup not found")

    destination = _require_sqlite_database()
    BACKUP_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    safety_backup = BACKUP_DIR / f"pre-restore-backup-{timestamp}.db"

    _copy_sqlite_database(destination, safety_backup)
    _copy_sqlite_database(source, destination)
    engine.dispose()

    return {
        "restored": True,
        "filename": source.name,
        "safety_backup": _serialize_backup(safety_backup),
    }


@router.delete("/{filename}", status_code=status.HTTP_204_NO_CONTENT)
def delete_backup(filename: str, _current_user=Depends(require_roles("Super Admin"))):
    path = _backup_path(filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Backup not found")
    path.unlink()
