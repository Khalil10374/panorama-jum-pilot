import { ImagePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "./Button";

const roleOptions = ["Super Admin", "Manager", "Accountant", "Receptionist", "POS Operator", "Store Manager", "HR Officer"];
const parkingVehicleTypeOptions = ["Bus", "Minibus / Small Bus", "Private Car / Sedan", "HiAce / Microbus"];
const rideCategoryOptions = ["Ride", "Entrance Pass"];

export default function RecordModal({ title, fields, defaults = {}, record, onClose, onSave }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    const initial = { ...defaults };
    fields.forEach(([key]) => {
      initial[key] = record?.[key] ?? initial[key] ?? "";
    });
    setForm(initial);
  }, [fields, defaults, record]);

  function update(key, value, type) {
    if (type === "number" || type === "amount") value = value === "" ? "" : Number(value);
    if (value === "true") value = true;
    if (value === "false") value = false;
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateImage(key, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, [key]: reader.result }));
    reader.readAsDataURL(file);
  }

  function submit(event) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form onSubmit={submit} className="surface max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg shadow-lift">
        <div className="sticky top-0 flex items-center justify-between border-b border-white/30 bg-white/20 p-5 backdrop-blur-xl">
          <div>
            <h2 className="text-xl font-bold text-ink">{record ? "Edit" : "Add"} {title}</h2>
            <p className="text-sm text-slate-500">Fields marked by the module are saved to the API.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-white/30" title="Close">
            <X size={20} />
          </button>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {fields.map(([key, label, type = "text"]) => (
            <label key={key} className="grid gap-1 text-sm font-semibold text-slate-700">
              {label}
              {type === "image" ? (
                <span className="field-shell grid gap-3 rounded-lg p-3 font-normal">
                  {form[key] ? (
                    <img src={form[key]} alt={`${label} preview`} className="h-24 w-24 rounded-lg object-cover shadow-sm" />
                  ) : (
                    <span className="flex h-24 w-24 items-center justify-center rounded-lg border border-white/50 bg-white/40 text-slate-500">
                      <ImagePlus size={28} />
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => updateImage(key, event.target.files?.[0])}
                    className="text-sm font-normal"
                  />
                </span>
              ) : type === "textarea" ? (
                <textarea
                  value={form[key] ?? ""}
                  onChange={(event) => update(key, event.target.value, type)}
                  className="field-shell min-h-24 rounded-lg px-3 py-2 font-normal outline-none"
                />
              ) : type === "role" ? (
                <select
                  value={form[key] ?? ""}
                  onChange={(event) => update(key, event.target.value, type)}
                  className="field-shell min-h-11 rounded-lg px-3 font-normal outline-none"
                  required
                >
                  <option value="">Select role</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              ) : type === "vehicle-type" || type === "parking-vehicle-type" || type === "parking-rate-type" ? (
                <select
                  value={form[key] ?? ""}
                  onChange={(event) => update(key, event.target.value, type)}
                  className="field-shell min-h-11 rounded-lg px-3 font-normal outline-none"
                  required
                >
                  <option value="">Select vehicle type</option>
                  {parkingVehicleTypeOptions.map((vehicleType) => (
                    <option key={vehicleType} value={vehicleType}>{vehicleType}</option>
                  ))}
                </select>
              ) : type === "ride-category" ? (
                <select
                  value={form[key] ?? ""}
                  onChange={(event) => update(key, event.target.value, type)}
                  className="field-shell min-h-11 rounded-lg px-3 font-normal outline-none"
                  required
                >
                  <option value="">Select category</option>
                  {rideCategoryOptions.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              ) : type === "boolean" ? (
                <select
                  value={String(form[key] ?? true)}
                  onChange={(event) => update(key, event.target.value, type)}
                  className="field-shell min-h-11 rounded-lg px-3 font-normal outline-none"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              ) : key.includes("status") || key === "type" || key === "module" ? (
                <input
                  value={form[key] ?? ""}
                  onChange={(event) => update(key, event.target.value, type)}
                  className="field-shell min-h-11 rounded-lg px-3 font-normal outline-none"
                  list={`${key}-options`}
                />
              ) : (
                <input
                  type={type === "amount" ? "number" : type}
                  step={type === "amount" || type === "number" ? "0.01" : undefined}
                  min={type === "amount" || type === "number" ? "0" : undefined}
                  value={form[key] ?? ""}
                  onChange={(event) => update(key, event.target.value, type)}
                  className="field-shell min-h-11 rounded-lg px-3 font-normal outline-none"
                  placeholder={key === "password" && record ? "Leave blank to keep current password" : undefined}
                  required={!record && ["name", "email", "password", "code", "sku", "ticket_code", "invoice_number", "employee_code", "po_number"].some((needle) => key.includes(needle))}
                />
              )}
              <datalist id={`${key}-options`}>
                <option value="Available" />
                <option value="Occupied" />
                <option value="Paid" />
                <option value="Unpaid" />
                <option value="Due" />
                <option value="Open" />
                <option value="Closed" />
                <option value="Coffee" />
                <option value="Store" />
                <option value="Restaurant" />
                <option value="Income" />
                <option value="Expense" />
              </datalist>
            </label>
          ))}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-white/30 bg-white/20 p-5 backdrop-blur-xl">
          <Button type="button" variant="soft" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save Record</Button>
        </div>
      </form>
    </div>
  );
}
