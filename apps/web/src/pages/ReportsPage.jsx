import { FileDown, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "../components/Button";
import { api } from "../lib/api";

export default function ReportsPage() {
  const [period, setPeriod] = useState("daily");
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.report(period, period === "custom" ? fromDate : "", period === "custom" ? toDate : "").then(setReport);
  }, [period, fromDate, toDate]);

  function exportCsv() {
    if (!report) return;
    const rows = ["Label,Amount", ...report.rows.map((row) => `${row.label},${row.amount}`)].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${period}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-5">
      <section className="surface flex flex-col gap-3 rounded-lg p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-lagoon">Reports</p>
          <h1 className="text-3xl font-black text-ink">Daily, Monthly & Yearly Reports</h1>
          <p className="text-slate-500">Print as PDF from the browser or export CSV for Excel.</p>
        </div>
        <div className="no-print flex gap-2">
          <Button variant="soft" onClick={exportCsv}><FileDown size={17} /> Excel CSV</Button>
          <Button variant="soft" onClick={() => window.print()}><Printer size={17} /> Print/PDF</Button>
        </div>
      </section>
      <div className="no-print flex gap-2">
        {["daily", "monthly", "yearly", "custom"].map((item) => (
          <button
            key={item}
            onClick={() => setPeriod(item)}
            className={`rounded-lg border px-4 py-2 text-sm font-bold capitalize ${
              period === item ? "border-white/30 bg-white/16 text-white" : "border-white/25 bg-white/10 text-white/80 backdrop-blur-md"
            }`}
          >
            {item}
          </button>
        ))}
        {period === "custom" ? (
          <>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="field-shell min-h-10 rounded-lg px-3 text-sm outline-none"
            />
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="field-shell min-h-10 rounded-lg px-3 text-sm outline-none"
            />
          </>
        ) : null}
      </div>
      <section className="print-surface surface rounded-lg p-5">
        {report ? (
          <>
            <div className="print-brand mb-5 flex items-center gap-3 border-b border-white/40 pb-4">
              <img src="/panorama-logo.png" alt="Panorama Jum logo" className="h-14 w-14 rounded-lg bg-white/85 object-contain p-1 shadow-sm" />
              <div>
                <h2 className="text-xl font-black text-ink">Panorama Jum</h2>
                <p className="text-sm font-semibold text-slate-600">Integrated Resort Management Report</p>
              </div>
            </div>
            <div className="mb-5">
              <h2 className="text-xl font-black capitalize text-ink">{report.period} Summary</h2>
              <p className="text-sm text-slate-500">From {report.from} to {report.to} | Cottage bookings: {report.bookings}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead className="bg-white/20 text-sm uppercase text-slate-500 backdrop-blur-md">
                  <tr>
                    <th className="rounded-l-lg px-4 py-3">Report Head</th>
                    <th className="rounded-r-lg px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.rows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-4 font-bold text-ink">{row.label}</td>
                      <td className="px-4 py-4 text-right font-black text-lagoon">৳{Number(row.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-slate-500">Loading report...</p>
        )}
      </section>
    </div>
  );
}
