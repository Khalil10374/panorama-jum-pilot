import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export default function ParkingBillPrintPage({ ticketId, onDone }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const printedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api
      .checkoutParkingTicket(ticketId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  useEffect(() => {
    if (!data || printedRef.current) return;
    printedRef.current = true;
    window.history.replaceState({}, "", window.location.pathname);
    window.setTimeout(() => window.print(), 350);
  }, [data]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6 text-slate-900">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold">Parking bill failed</h1>
          <p className="mt-2 text-sm">{error}</p>
          <button className="mt-4 rounded bg-slate-900 px-4 py-2 text-white" onClick={onDone}>Back</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-slate-900">Preparing parking bill...</div>;
  }

  const { ticket, vehicle, bill } = data;
  const entryTime = ticket.entry_time ? new Date(ticket.entry_time) : null;
  const exitTime = ticket.exit_time ? new Date(ticket.exit_time) : new Date();

  return (
    <main className="parking-print-page bg-white text-slate-950">
      <section className="parking-print-ticket">
        <div className="parking-print-brand">
          <img src="/panorama-logo.png" alt="" />
          <div>
            <h1>Panorama Jum</h1>
            <p>Parking Checkout Bill</p>
          </div>
        </div>
        <h2>Parking Bill</h2>
        <BillRow label="Ticket No" value={ticket.ticket_code} />
        <BillRow label="Plate Number" value={vehicle.plate_number} />
        <BillRow label="Vehicle Type" value={vehicle.vehicle_type} />
        <BillRow label="Owner/User" value={vehicle.owner_name || "-"} />
        <BillRow label="Entry" value={entryTime ? entryTime.toLocaleString() : "-"} />
        <BillRow label="Exit" value={exitTime.toLocaleString()} />
        <BillRow label="Duration" value={`${bill.minutes} min / ${bill.hours} hr`} />
        <BillRow label="Parking Fee" value={`৳${formatMoney(bill.rate)} (one-time)`} />
        <BillRow label="Total" value={`৳${formatMoney(ticket.amount || bill.amount)}`} strong />
        <p className="parking-print-footer">Payment received. Thank you.</p>
      </section>
      <button className="no-print mt-4 rounded bg-slate-900 px-4 py-2 text-white" onClick={onDone}>Back</button>
    </main>
  );
}

function BillRow({ label, value, strong = false }) {
  return (
    <div className={`parking-print-row ${strong ? "parking-print-total" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}
