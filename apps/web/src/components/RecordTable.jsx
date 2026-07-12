import { Edit3, FileDown, Plus, Printer, Trash2 } from "lucide-react";
import Button from "./Button";

export default function RecordTable({
  title,
  fields,
  rows,
  search,
  onSearch,
  onAdd,
  onEdit,
  onDelete,
  onExport,
  onPrint,
  onRowDoubleClick,
  rowAction,
  extraControls = null,
  showAdd = true,
  showEdit = true,
  showDelete = true,
  editIcon: EditIcon = Edit3,
  deleteIcon: DeleteIcon = Trash2
}) {
  const visibleFields = fields.slice(0, 7);
  return (
    <section className="print-surface surface overflow-hidden rounded-lg">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-ink">{title}</h2>
          <p className="text-sm text-slate-500">{rows.length} records available</p>
        </div>
        <div className="no-print flex flex-col gap-2 sm:flex-row">
          {extraControls}
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search or filter"
            className="field-shell min-h-10 rounded-lg px-3 text-sm outline-none"
          />
          <Button variant="soft" onClick={onExport}>
            <FileDown size={17} /> Excel CSV
          </Button>
          <Button variant="soft" onClick={onPrint || (() => window.print())}>
            <Printer size={17} /> Print/PDF
          </Button>
          {showAdd ? (
            <Button onClick={onAdd}>
              <Plus size={17} /> Add
            </Button>
          ) : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-white/20 text-xs uppercase tracking-wide text-slate-500 backdrop-blur-md">
            <tr>
              {visibleFields.map(([key, label]) => (
                <th key={key} className="px-4 py-3 font-bold">{label}</th>
              ))}
              <th className="no-print px-4 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? (
              rows.map((row) => (
                <RecordRow
                  key={row.id}
                  row={row}
                  visibleFields={visibleFields}
                  onRowDoubleClick={onRowDoubleClick}
                  rowAction={rowAction}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  showEdit={showEdit}
                  showDelete={showDelete}
                  EditIcon={EditIcon}
                  DeleteIcon={DeleteIcon}
                />
              ))
            ) : (
              <tr>
                <td colSpan={visibleFields.length + 1} className="px-4 py-10 text-center text-slate-500">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecordRow({ row, visibleFields, onRowDoubleClick, rowAction, onEdit, onDelete, showEdit, showDelete, EditIcon, DeleteIcon }) {
  const RowActionIcon = rowAction?.icon;

  return (
    <tr
      className={`transition hover:bg-white/20 ${onRowDoubleClick ? "cursor-pointer" : ""}`}
      onDoubleClick={() => onRowDoubleClick?.(row)}
      title={onRowDoubleClick ? "Double click to create bill" : undefined}
    >
      {visibleFields.map(([key]) => (
        <td key={key} className="max-w-[220px] truncate px-4 py-3 text-slate-700">
          {key === "photo_url" && row[key] ? (
            <img src={row[key]} alt="Record" className="h-10 w-10 rounded-lg object-cover shadow-sm" />
          ) : (
            formatCellValue(key, row[key])
          )}
        </td>
      ))}
      <td className="no-print px-4 py-3">
        <div className="flex justify-end gap-2">
          {RowActionIcon ? (
            <button
              type="button"
              disabled={rowAction.disabled?.(row)}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-300/50 bg-emerald-500/24 px-3 text-emerald-50 transition hover:bg-emerald-500/34 disabled:cursor-not-allowed disabled:opacity-40 ${rowAction.label ? "min-w-[7rem]" : "w-11 px-0"} ${rowAction.className || ""}`}
              onClick={() => !rowAction.disabled?.(row) && rowAction.onClick(row)}
              title={rowAction.disabled?.(row) ? "Already used" : rowAction.title}
              aria-label={rowAction.title}
            >
              <RowActionIcon size={22} strokeWidth={2.6} />
              {rowAction.label ? <span className="text-sm font-bold">{rowAction.label}</span> : null}
            </button>
          ) : null}
          {showEdit ? (
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-sky-300/45 bg-sky-500/22 text-sky-50 transition hover:bg-sky-500/32"
              onClick={() => onEdit(row)}
              title="Edit"
              aria-label="Edit"
            >
              <EditIcon size={22} strokeWidth={2.6} />
            </button>
          ) : null}
          {showDelete ? (
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-rose-300/35 bg-rose-600 text-white transition hover:bg-rose-700"
              onClick={() => onDelete(row)}
              title="Delete"
              aria-label="Delete"
            >
              <DeleteIcon size={22} strokeWidth={2.6} />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function formatCellValue(key, value) {
  if (!value) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "amount") return `৳${Number(value).toLocaleString()}`;
  if (key.includes("_time") || key.endsWith("_at")) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString();
  }
  return String(value);
}
