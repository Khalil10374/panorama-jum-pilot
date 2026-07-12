import { DatabaseBackup, Download, HardDrive, RefreshCcw, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "../components/Button";
import { api } from "../lib/api";

function formatSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BackupPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const data = await api.backups();
      setBackups(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createBackup() {
    setWorking(true);
    setError("");
    setMessage("");
    try {
      await api.createBackup();
      await load();
      setMessage("Backup created successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }

  async function download(filename) {
    setError("");
    setMessage("");
    try {
      const blob = await api.downloadBackup(filename);
      downloadBlob(filename, blob);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(filename) {
    if (!confirm(`Delete backup ${filename}?`)) return;
    setError("");
    setMessage("");
    try {
      await api.deleteBackup(filename);
      await load();
      setMessage("Backup deleted successfully.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function restore(filename) {
    const confirmed = confirm(
      `Restore ${filename}?\n\nThis will replace the current database. A safety backup of the current database will be created first.`
    );
    if (!confirmed) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const result = await api.restoreBackup(filename);
      await load();
      setMessage(`Restore completed. Safety backup saved as ${result.safety_backup.filename}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="surface image-glass-card flex flex-col gap-4 rounded-lg p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-lagoon text-white shadow-sm">
            <DatabaseBackup size={26} />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-lagoon">Settings</p>
            <h1 className="text-3xl font-black text-ink">Database Backup</h1>
            <p className="text-slate-500">Create and keep admin-controlled database backup files.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="soft" onClick={load} disabled={loading || working}>
            <RefreshCcw size={17} /> Refresh
          </Button>
          <Button onClick={createBackup} disabled={working}>
            <DatabaseBackup size={17} /> {working ? "Creating..." : "Create Backup"}
          </Button>
        </div>
      </section>

      {error ? <p className="rounded-lg bg-rose-500/14 p-3 text-sm font-semibold text-rose-100 ring-1 ring-rose-300/20">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-500/14 p-3 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-300/20">{message}</p> : null}

      <section className="surface overflow-hidden rounded-lg">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <h2 className="text-lg font-black text-ink">Saved Backups</h2>
            <p className="text-sm text-slate-500">{backups.length} backup files available</p>
          </div>
        </div>
        <div className="grid gap-3 p-4">
          {loading ? <p className="text-sm text-slate-500">Loading backups...</p> : null}
          {!loading && backups.length === 0 ? (
            <div className="glass-chip rounded-lg p-5 text-center">
              <HardDrive className="mx-auto mb-3 text-white/70" size={28} />
              <p className="font-bold text-ink">No backups yet</p>
              <p className="mt-1 text-sm text-slate-500">Create a backup whenever you want to save the current database state.</p>
            </div>
          ) : null}
          {backups.map((backup) => (
            <div key={backup.filename} className="glass-chip flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{backup.filename}</p>
                <p className="text-sm text-slate-500">
                  {formatSize(backup.size)} | Created {new Date(backup.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="soft" className="h-9 w-9 px-0" onClick={() => restore(backup.filename)} disabled={working} title="Restore">
                  <RotateCcw size={16} />
                </Button>
                <Button variant="soft" className="h-9 w-9 px-0" onClick={() => download(backup.filename)} title="Download">
                  <Download size={16} />
                </Button>
                <Button variant="danger" className="h-9 w-9 px-0" onClick={() => remove(backup.filename)} title="Delete">
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
