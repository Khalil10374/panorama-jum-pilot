import { useEffect, useMemo, useState } from "react";
import { ClipboardPenLine, ReceiptText, TicketCheck, Trash2 } from "lucide-react";
import QRCode from "qrcode";
import RecordModal from "../components/RecordModal";
import RecordTable from "../components/RecordTable";
import RidePassSale from "../components/RidePassSale";
import { api } from "../lib/api";

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((key) => escape(row[key])).join(","))].join("\n");
}

function downloadCsv(filename, rows) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function todayInputValue() {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60000;
  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function printParkingA4Report(rows, { title, fromDate, toDate, user, resourceName }) {
  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) {
    alert("Please allow popups to print the parking report.");
    return;
  }

  const logoUrl = `${window.location.origin}/panorama-logo.png`;
  const totalIncome = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const dateRange = fromDate || toDate ? `${fromDate || "Start"} to ${toDate || "Today"}` : "All dates";
  const generatedAt = new Date().toLocaleString();
  const printedBy = user?.name || "Unknown user";
  const printedRole = user?.role || "Unknown role";
  const columns =
    resourceName === "vehicles"
      ? [
          ["plate_number", "Plate Number"],
          ["vehicle_type", "Vehicle Type"],
          ["owner_name", "Owner/User"],
          ["phone", "Phone"]
        ]
      : [
          ["ticket_code", "Ticket Code"],
          ["plate_number", "Plate Number"],
          ["owner_name", "Owner/User"],
          ["vehicle_type", "Vehicle Type"],
          ["entry_time", "Entry Time"],
          ["exit_time", "Exit Time"],
          ["amount", "Amount"]
        ];
  const formatReportValue = (key, value) => {
    if (!value) return "-";
    if (key.includes("_time") || key.endsWith("_at")) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleString();
    }
    if (key === "amount") return `৳${Number(value || 0).toLocaleString()}`;
    return String(value);
  };
  const bodyRows = rows
    .map(
      (row, index) => `
        <tr>
          <td>${index + 1}</td>
          ${columns.map(([key]) => `<td class="${key === "amount" ? "amount" : ""}">${escapeHtml(formatReportValue(key, row[key]))}</td>`).join("")}
        </tr>
      `
    )
    .join("");
  const tableHeaders = columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("");
  const emptyColspan = columns.length + 1;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body { color: #172033; font-family: Arial, sans-serif; margin: 0; }
          .header { align-items: center; border-bottom: 2px solid #0f766e; display: flex; justify-content: space-between; padding-bottom: 14px; }
          .brand { align-items: center; display: flex; gap: 12px; }
          .brand img { height: 58px; object-fit: contain; width: 58px; }
          h1 { font-size: 22px; margin: 0; }
          .subtitle { color: #475569; font-size: 12px; margin-top: 4px; }
          .meta { color: #475569; font-size: 11px; line-height: 1.6; text-align: right; }
          .summary { display: grid; gap: 10px; grid-template-columns: repeat(3, 1fr); margin: 18px 0; }
          .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
          .card span { color: #64748b; display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .card strong { display: block; font-size: 22px; margin-top: 6px; }
          .card small { color: #64748b; display: block; font-size: 11px; margin-top: 4px; }
          table { border-collapse: collapse; font-size: 10.5px; width: 100%; }
          th { background: #0f766e; color: #fff; text-align: left; }
          th, td { border: 1px solid #cbd5e1; padding: 7px 6px; vertical-align: top; }
          tbody tr:nth-child(even) { background: #f8fafc; }
          .amount { font-weight: 700; text-align: right; }
          .footer { border-top: 1px solid #cbd5e1; color: #64748b; font-size: 10px; margin-top: 18px; padding-top: 8px; text-align: center; }
        </style>
      </head>
      <body>
        <header class="header">
          <div class="brand">
            <img src="${logoUrl}" alt="">
            <div>
              <h1>Panorama Jum</h1>
              <div class="subtitle">${escapeHtml(title)}</div>
            </div>
          </div>
          <div class="meta">
            <div><strong>Date Filter:</strong> ${escapeHtml(dateRange)}</div>
            <div><strong>Generated:</strong> ${escapeHtml(generatedAt)}</div>
          </div>
        </header>
        <section class="summary">
          <div class="card"><span>Total Vehicles</span><strong>${rows.length}</strong></div>
          <div class="card"><span>Total Income</span><strong>৳${totalIncome.toLocaleString()}</strong></div>
          <div class="card"><span>Printed By</span><strong>${escapeHtml(printedBy)}</strong><small>${escapeHtml(printedRole)}</small></div>
        </section>
        <table>
          <thead>
            <tr>
              <th>#</th>
              ${tableHeaders}
            </tr>
          </thead>
          <tbody>
            ${bodyRows || `<tr><td colspan="${emptyColspan}" style="text-align:center;">No parking records found for this filter.</td></tr>`}
          </tbody>
        </table>
        <p class="footer">This report was generated by Panorama Jum Integrated Resort Management.</p>
        <script>
          window.onload = () => {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

async function printVehicleTicket(vehicle, user, targetWindow) {
  const printedAt = new Date();
  const ticketNumber = vehicle.parking_ticket_code || `VH-${String(vehicle.id ?? Date.now()).padStart(5, "0")}`;
  const logoUrl = `${window.location.origin}/panorama-logo.png`;
  const checkoutUrl = vehicle.parking_ticket_id ? `${window.location.origin}/?parkingCheckout=${vehicle.parking_ticket_id}` : "";
  const qrCodeUrl = checkoutUrl ? await QRCode.toDataURL(checkoutUrl, { margin: 1, width: 132 }) : "";
  const printWindow = targetWindow || window.open("", "_blank", "width=420,height=640");
  if (!printWindow) {
    alert("Please allow popups to print the parking ticket.");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(ticketNumber)}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          * { box-sizing: border-box; }
          body {
            color: #111827;
            font-family: Arial, sans-serif;
            margin: 0;
            width: 72mm;
          }
          .ticket {
            border: 1px dashed #111827;
            padding: 10px;
            width: 100%;
          }
          .brand {
            align-items: center;
            border-bottom: 1px solid #d1d5db;
            display: flex;
            gap: 8px;
            justify-content: center;
            padding-bottom: 8px;
            text-align: left;
          }
          .brand img {
            height: 38px;
            object-fit: contain;
            width: 38px;
          }
          h1 {
            font-size: 15px;
            margin: 0;
          }
          .subtitle {
            font-size: 10px;
            margin-top: 2px;
          }
          .title {
            font-size: 13px;
            font-weight: 700;
            margin: 10px 0;
            text-align: center;
            text-transform: uppercase;
          }
          .row {
            display: flex;
            font-size: 11px;
            justify-content: space-between;
            gap: 10px;
            padding: 4px 0;
          }
          .label {
            color: #4b5563;
            flex: 0 0 30mm;
          }
          .value {
            flex: 1;
            font-weight: 700;
            text-align: right;
            word-break: break-word;
          }
          .footer {
            border-top: 1px solid #d1d5db;
            font-size: 10px;
            margin-top: 10px;
            padding-top: 8px;
            text-align: center;
          }
          .qr {
            margin-top: 10px;
            text-align: center;
          }
          .qr img {
            height: 92px;
            width: 92px;
          }
          .qr p {
            font-size: 9px;
            margin: 3px 0 0;
          }
        </style>
      </head>
      <body>
        <section class="ticket">
          <div class="brand">
            <img src="${logoUrl}" alt="">
            <div>
              <h1>Panorama Jum</h1>
              <div class="subtitle">Integrated Resort Management</div>
            </div>
          </div>
          <div class="title">Parking Vehicle Ticket</div>
          <div class="row"><span class="label">Ticket No</span><span class="value">${escapeHtml(ticketNumber)}</span></div>
          <div class="row"><span class="label">Plate Number</span><span class="value">${escapeHtml(vehicle.plate_number)}</span></div>
          <div class="row"><span class="label">Vehicle Type</span><span class="value">${escapeHtml(vehicle.vehicle_type)}</span></div>
          <div class="row"><span class="label">Owner/User Name</span><span class="value">${escapeHtml(vehicle.owner_name || "-")}</span></div>
          <div class="row"><span class="label">Phone</span><span class="value">${escapeHtml(vehicle.phone || "-")}</span></div>
          <div class="row"><span class="label">Created By</span><span class="value">${escapeHtml(user?.name || user?.role || "-")}</span></div>
          <div class="row"><span class="label">Date</span><span class="value">${escapeHtml(printedAt.toLocaleDateString())}</span></div>
          <div class="row"><span class="label">Time</span><span class="value">${escapeHtml(printedAt.toLocaleTimeString())}</span></div>
          ${qrCodeUrl ? `<div class="qr"><img src="${qrCodeUrl}" alt=""><p>Scan for checkout bill</p></div>` : ""}
          <div class="footer">Please keep this ticket until exit.</div>
        </section>
        <script>
          window.onload = () => {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function printParkingBill({ ticket, vehicle, bill }, user, targetWindow) {
  const logoUrl = `${window.location.origin}/panorama-logo.png`;
  const printWindow = targetWindow || window.open("", "_blank", "width=420,height=680");
  if (!printWindow) {
    alert("Please allow popups to print the parking bill.");
    return;
  }

  const entryTime = ticket.entry_time ? new Date(ticket.entry_time) : null;
  const exitTime = ticket.exit_time ? new Date(ticket.exit_time) : new Date();

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(ticket.ticket_code)}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          * { box-sizing: border-box; }
          body { color: #111827; font-family: Arial, sans-serif; margin: 0; width: 72mm; }
          .ticket { border: 1px dashed #111827; padding: 10px; width: 100%; }
          .brand { align-items: center; border-bottom: 1px solid #d1d5db; display: flex; gap: 8px; justify-content: center; padding-bottom: 8px; }
          .brand img { height: 38px; object-fit: contain; width: 38px; }
          h1 { font-size: 15px; margin: 0; }
          .subtitle { font-size: 10px; margin-top: 2px; }
          .title { font-size: 13px; font-weight: 700; margin: 10px 0; text-align: center; text-transform: uppercase; }
          .row { display: flex; font-size: 11px; justify-content: space-between; gap: 10px; padding: 4px 0; }
          .label { color: #4b5563; flex: 0 0 30mm; }
          .value { flex: 1; font-weight: 700; text-align: right; word-break: break-word; }
          .total { border-top: 1px solid #111827; font-size: 15px; margin-top: 8px; padding-top: 8px; }
          .footer { border-top: 1px solid #d1d5db; font-size: 10px; margin-top: 10px; padding-top: 8px; text-align: center; }
        </style>
      </head>
      <body>
        <section class="ticket">
          <div class="brand">
            <img src="${logoUrl}" alt="">
            <div>
              <h1>Panorama Jum</h1>
              <div class="subtitle">Parking Bill</div>
            </div>
          </div>
          <div class="title">Parking Checkout Bill</div>
          <div class="row"><span class="label">Ticket No</span><span class="value">${escapeHtml(ticket.ticket_code)}</span></div>
          <div class="row"><span class="label">Plate Number</span><span class="value">${escapeHtml(vehicle.plate_number)}</span></div>
          <div class="row"><span class="label">Vehicle Type</span><span class="value">${escapeHtml(vehicle.vehicle_type)}</span></div>
          <div class="row"><span class="label">Owner/User</span><span class="value">${escapeHtml(vehicle.owner_name || "-")}</span></div>
          <div class="row"><span class="label">Entry</span><span class="value">${entryTime ? escapeHtml(entryTime.toLocaleString()) : "-"}</span></div>
          <div class="row"><span class="label">Exit</span><span class="value">${escapeHtml(exitTime.toLocaleString())}</span></div>
          <div class="row"><span class="label">Duration</span><span class="value">${escapeHtml(`${bill.minutes} min / ${bill.hours} hr`)}</span></div>
          <div class="row"><span class="label">Parking Fee</span><span class="value">৳${escapeHtml(formatMoney(bill.rate))} (one-time)</span></div>
          <div class="row"><span class="label">Operator</span><span class="value">${escapeHtml(user?.name || bill.operator || "-")}</span></div>
          <div class="row total"><span class="label">Total</span><span class="value">৳${escapeHtml(formatMoney(ticket.amount || bill.amount))}</span></div>
          <div class="footer">Payment received. Thank you.</div>
        </section>
        <script>
          window.onload = () => {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export default function ModulePage({ module, user }) {
  const [selectedResourceIndex, setSelectedResourceIndex] = useState(0);
  const visibleResources = useMemo(
    () => module.resources.filter((item) => !item.superAdminOnly || user.role === "Super Admin"),
    [module.resources, user.role]
  );
  const resourceIndex = Math.min(selectedResourceIndex, Math.max(visibleResources.length - 1, 0));
  const resource = visibleResources[resourceIndex];
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parkingSummary, setParkingSummary] = useState(null);
  const [rideSummary, setRideSummary] = useState(null);
  const [historyFromDate, setHistoryFromDate] = useState(todayInputValue());
  const [historyToDate, setHistoryToDate] = useState(todayInputValue());

  const Icon = module.icon;
  const defaultValues = useMemo(() => resource.defaultValues || {}, [resource]);
  const writeResourceName = resource.name === "parking-history" ? "parking-tickets" : resource.name;

  useEffect(() => {
    load();
  }, [resource.name, historyFromDate, historyToDate]);

  useEffect(() => {
    if (module.key === "rides") {
      const interval = window.setInterval(() => loadRideSummary(), 60_000);
      return () => window.clearInterval(interval);
    }
    if (module.key !== "parking" || !["vehicles", "parking-tickets"].includes(resource.name)) return undefined;
    const interval = window.setInterval(() => load(), 60_000);
    return () => window.clearInterval(interval);
  }, [module.key, resource.name, search]);

  useEffect(() => {
    if (module.key === "parking") loadParkingSummary();
    if (module.key === "rides") loadRideSummary();
  }, [module.key]);

  async function loadParkingSummary() {
    try {
      setParkingSummary(await api.parkingSummary());
    } catch {
      setParkingSummary(null);
    }
  }

  async function loadRideSummary() {
    try {
      setRideSummary(await api.rideSummary());
    } catch {
      setRideSummary(null);
    }
  }

  async function load(term = search) {
    setLoading(true);
    setError("");
    try {
      const data =
        resource.name === "vehicles"
          ? await api.parkingVehicles(term)
          : resource.name === "parking-tickets"
          ? await api.parkingTickets("open", term)
          : resource.name === "parking-history"
            ? await api.parkingTickets("history", term, historyFromDate, historyToDate)
            : await api.records(resource.name, term);
      let items = data.items;
      if (defaultValues.module) items = items.filter((item) => item.module === defaultValues.module);
      setRows(items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function changeSearch(value) {
    setSearch(value);
    load(value);
  }

  async function save(payload) {
    const ticketWindow = resource.name === "vehicles" ? window.open("", "_blank", "width=420,height=640") : null;
    try {
      const savedRecord = editing
        ? await api.update(writeResourceName, editing.id, payload)
        : await api.create(writeResourceName, { ...defaultValues, ...payload });
      setShowModal(false);
      setEditing(null);
      await load();
      if (module.key === "parking") await loadParkingSummary();
      if (module.key === "rides") await loadRideSummary();
      if (resource.name === "vehicles") await printVehicleTicket(savedRecord, user, ticketWindow);
    } catch (err) {
      if (ticketWindow) ticketWindow.close();
      setError(err.message);
    }
  }

  async function remove(row) {
    if (!confirm(`Delete ${resource.label} record #${row.id}?`)) return;
    try {
      await api.remove(writeResourceName, row.id);
      await load();
      if (module.key === "parking") await loadParkingSummary();
      if (module.key === "rides") await loadRideSummary();
    } catch (err) {
      setError(err.message);
    }
  }

  async function useRideTicket(row) {
    if (row.is_used) return;
    if (!confirm(`Validate Pass & Ride ticket ${row.ticket_code}?`)) return;
    try {
      await api.useRideTicket(row.id);
      await load();
      await loadRideSummary();
    } catch (err) {
      setError(err.message);
    }
  }

  async function checkoutParking(row) {
    const billWindow = window.open("", "_blank", "width=420,height=680");
    try {
      const result = await api.checkoutParkingTicket(row.id);
      await load();
      await loadParkingSummary();
      printParkingBill(result, user, billWindow);
    } catch (err) {
      if (billWindow) billWindow.close();
      setError(err.message);
    }
  }

  function printParkingReport() {
    const reportTitles = {
      vehicles: "Parking Tickets Report",
      "parking-tickets": "Checkout/Bill Report",
      "parking-history": "Parking History & Income Report"
    };
    printParkingA4Report(rows, {
      title: reportTitles[resource.name] || `${resource.label} Report`,
      fromDate: resource.name === "parking-history" ? historyFromDate : "",
      toDate: resource.name === "parking-history" ? historyToDate : "",
      user,
      resourceName: resource.name
    });
  }

  return (
    <div className="grid gap-5">
      <section className="surface image-glass-card flex flex-col gap-5 rounded-lg p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <span className={`flex h-14 w-14 items-center justify-center rounded-lg ${module.color} text-white shadow-sm`}>
            <Icon size={26} />
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-lagoon">Module</p>
            <h1 className="text-3xl font-black text-ink">{module.title}</h1>
            <p className="text-slate-500">Add, edit, delete, search, print, and export records.</p>
          </div>
        </div>
        {module.key === "parking" && parkingSummary ? (
          <div className="w-full xl:w-[640px]">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/55">Today's parking summary: {parkingSummary.date}</p>
            <div className="grid gap-3 sm:grid-cols-3">
            <ParkingMiniStat label="In Garage" value={parkingSummary.vehicles_in_garage} />
            <ParkingMiniStat label="Billed" value={`৳${Number(parkingSummary.billed_total).toLocaleString()}`} />
            <ParkingMiniStat label="Unbilled" value={parkingSummary.unbilled_count} />
            </div>
          </div>
        ) : null}
        {module.key === "rides" && rideSummary ? (
          <div className="w-full xl:w-[760px]">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/55">Today's Pass & Ride summary: {rideSummary.date}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <RideMiniStat label="Tickets Sold" value={rideSummary.tickets_sold} />
              <RideMiniStat label="Today's Revenue" value={`৳${Number(rideSummary.revenue).toLocaleString()}`} />
              <RideMiniStat label="Validated" value={rideSummary.validated} />
              <RideMiniStat label="Unused" value={rideSummary.unused} />
            </div>
            <p className="mt-2 text-right text-xs font-semibold text-white/55">{rideSummary.active_rides} active rides / passes</p>
          </div>
        ) : null}
      </section>

      {module.key === "rides" ? (
        <RidePassSale
          onSold={async () => {
            await load();
            await loadRideSummary();
          }}
        />
      ) : null}

      <div className="no-print flex gap-2 overflow-x-auto">
        {visibleResources.map((item, index) => (
          <button
            key={item.name}
            onClick={() => setSelectedResourceIndex(index)}
            className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-bold ${
              index === resourceIndex ? "border-white/30 bg-white/16 text-white" : "border-white/25 bg-white/10 text-white/80 backdrop-blur-md"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-coral">{error}</p> : null}
      {loading ? <p className="text-slate-500">Loading records...</p> : null}
      <RecordTable
        title={resource.label}
        fields={resource.fields}
        rows={rows}
        search={search}
        onSearch={changeSearch}
        onAdd={() => {
          setEditing(null);
          setShowModal(true);
        }}
        onEdit={resource.name === "parking-history" ? undefined : (row) => {
          setEditing(row);
          setShowModal(true);
        }}
        onDelete={resource.name === "parking-history" ? undefined : remove}
        onExport={() => downloadCsv(`${resource.name}.csv`, rows)}
        onPrint={module.key === "parking" ? printParkingReport : undefined}
        extraControls={
          resource.name === "parking-history" ? (
            <>
              <input
                type="date"
                value={historyFromDate}
                onChange={(event) => setHistoryFromDate(event.target.value)}
                className="field-shell min-h-10 rounded-lg px-3 text-sm outline-none"
                title="From date"
              />
              <input
                type="date"
                value={historyToDate}
                onChange={(event) => setHistoryToDate(event.target.value)}
                className="field-shell min-h-10 rounded-lg px-3 text-sm outline-none"
                title="To date"
              />
            </>
          ) : null
        }
        onRowDoubleClick={resource.name === "parking-tickets" ? checkoutParking : undefined}
        rowAction={resource.name === "parking-tickets" ? { icon: ReceiptText, title: "Checkout/Bill", onClick: checkoutParking, className: "border-emerald-300/35 bg-emerald-500/18 text-emerald-50" } : resource.name === "ride-tickets" ? { icon: TicketCheck, label: "Validate", title: "Validate Ticket", onClick: useRideTicket, disabled: (row) => row.is_used } : undefined}
        showAdd={!["parking-tickets", "parking-history", "ride-tickets"].includes(resource.name)}
        showEdit={!["parking-history", "ride-tickets"].includes(resource.name)}
        showDelete={!["parking-history", "ride-tickets"].includes(resource.name)}
        editIcon={ClipboardPenLine}
        deleteIcon={Trash2}
      />
      {showModal ? (
        <RecordModal
          title={resource.label}
          fields={resource.fields}
          defaults={defaultValues}
          record={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
          onSave={save}
        />
      ) : null}
    </div>
  );
}

function ParkingMiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur-md">
      <p className="text-xs font-bold uppercase tracking-wide text-white/58">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function RideMiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur-md">
      <p className="text-xs font-bold uppercase tracking-wide text-white/58">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
