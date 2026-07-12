from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.core.settings import get_settings
from src.db.migrations import ensure_runtime_columns
from src.db.session import Base, SessionLocal, engine
from src.routers import auth, backups, crud, dashboard, parking, pos, reports, rides
from src.seed import seed_database


settings = get_settings()
app = FastAPI(title=f"{settings.app_name} Integrated Resort Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(backups.router, prefix=settings.api_prefix)
app.include_router(dashboard.router, prefix=settings.api_prefix)
app.include_router(parking.router, prefix=settings.api_prefix)
app.include_router(crud.router, prefix=settings.api_prefix)
app.include_router(pos.router, prefix=settings.api_prefix)
app.include_router(rides.router, prefix=settings.api_prefix)
app.include_router(reports.router, prefix=settings.api_prefix)

slider_dir = Path("Pic") / "Slider"
if slider_dir.exists():
    app.mount("/media/slider", StaticFiles(directory=slider_dir), name="slider-media")

web_dist = Path("apps") / "web" / "dist"
web_index = web_dist / "index.html"
if web_index.exists():
    assets_dir = web_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="web-assets")


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    ensure_runtime_columns()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


@app.get("/")
def root():
    if web_index.exists():
        return FileResponse(web_index)
    return {"name": settings.app_name, "status": "ok", "docs": "/docs"}


if web_index.exists():
    @app.get("/{full_path:path}")
    def frontend_fallback(full_path: str):
        requested = (web_dist / full_path).resolve()
        dist_root = web_dist.resolve()
        if dist_root in requested.parents and requested.is_file():
            return FileResponse(requested)
        return FileResponse(web_index)
