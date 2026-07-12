import { CheckCircle2, Printer, Ticket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import Button from "./Button";
import { api } from "../lib/api";

const pricingOptions = [
  ["one_time", "One-time", "price"],
  ["30_minutes", "30 Minutes", "price_30_minutes"],
  ["1_hour", "1 Hour", "price_1_hour"]
];

export default function RidePassSale({ onSold }) {
  const [rides, setRides] = useState([]);
  const [rideId, setRideId] = useState("");
  const [pricingOption, setPricingOption] = useState("one_time");
  const [quantity, setQuantity] = useState(1);
  const [childName, setChildName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.records("rides").then((data) => {
      const available = data.items.filter((ride) => ["open", "active", "available"].includes(String(ride.status || "").toLowerCase()));
      setRides(available);
      setRideId((current) => current || String(available[0]?.id || ""));
    }).catch((err) => setError(err.message));
  }, []);

  const selectedRide = rides.find((ride) => String(ride.id) === String(rideId));
  const availablePricingOptions = useMemo(
    () => pricingOptions.filter(([, , key]) => Number(selectedRide?.[key] || 0) > 0),
    [selectedRide]
  );
  const priceKey = pricingOptions.find(([key]) => key === pricingOption)?.[2] || "price";
  const unitPrice = Number(selectedRide?.[priceKey] || 0);
  const total = unitPrice * Math.max(1, Number(quantity) || 1);

  useEffect(() => {
    if (!availablePricingOptions.some(([key]) => key === pricingOption)) {
      setPricingOption(availablePricingOptions[0]?.[0] || "one_time");
    }
  }, [availablePricingOptions, pricingOption]);

  async function sell() {
    setError("");
    if (!selectedRide) return setError("Select an available ride or pass");
    if (!unitPrice) return setError("This ride/pass has no price for the selected duration");
    const printWindow = window.open("", "_blank", "width=420,height=680");
    setSaving(true);
    try {
      const result = await api.sellRideTicket({
        ride_id: Number(rideId),
        child_name: childName,
        quantity: Math.max(1, Number(quantity) || 1),
        pricing_option: pricingOption,
        payment_method: paymentMethod
      });
      setReceipt(result);
      setRideId("");
      setPricingOption("one_time");
      setChildName("");
      setQuantity(1);
      await onSold?.();
      if (printWindow) await printRideTicket(result, printWindow);
    } catch (err) {
      if (printWindow) printWindow.close();
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface rounded-lg p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-lagoon">Pass & Ride counter</p>
          <h2 className="text-2xl font-black text-ink">Sell a pass or ride ticket</h2>
          <p className="text-sm text-slate-500">Price is calculated automatically and a unique ticket is generated after payment.</p>
        </div>
        <Ticket className="text-coral" size={30} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1 text-sm font-semibold text-slate-700 xl:col-span-2">Ride / Pass
          <select value={rideId} onChange={(event) => setRideId(event.target.value)} className="field-shell min-h-11 rounded-lg px-3 outline-none">
            <option value="">Select ride / pass</option>
            {rides.map((ride) => <option key={ride.id} value={ride.id}>{ride.name} — ৳{ride.price || ride.price_1_hour || ride.price_30_minutes}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">Duration / Type
          <select value={pricingOption} onChange={(event) => setPricingOption(event.target.value)} className="field-shell min-h-11 rounded-lg px-3 outline-none">
            {availablePricingOptions.map(([key, label, priceKeyForOption]) => <option key={key} value={key}>{label} — ৳{selectedRide?.[priceKeyForOption]}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">Quantity
          <input type="number" min="1" max="100" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="field-shell min-h-11 rounded-lg px-3 outline-none" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">Child / Guest Name
          <input value={childName} onChange={(event) => setChildName(event.target.value)} placeholder="Optional" className="field-shell min-h-11 rounded-lg px-3 outline-none" />
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-white/20 bg-white/10 p-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">Payment Method
          <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="field-shell min-h-11 rounded-lg px-3 outline-none">
            {['Cash', 'Card', 'Mobile Banking'].map((method) => <option key={method} value={method}>{method}</option>)}
          </select>
        </label>
        <div className="text-left sm:text-right"><p className="text-sm text-slate-500">Total</p><p className="text-3xl font-black text-ink">৳{total.toLocaleString()}</p></div>
        <Button disabled={saving || !selectedRide || !unitPrice} onClick={sell}>{saving ? "Processing..." : "Sell & Print Ticket"} <Printer size={17} /></Button>
      </div>
      {error ? <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-coral">{error}</p> : null}
      {receipt ? <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><CheckCircle2 size={18} /> Ticket {receipt.ticket_code} sold — ৳{receipt.total_amount}</div> : null}
    </section>
  );
}

async function printRideTicket(ticket, printWindow) {
  const qr = await QRCode.toDataURL(ticket.qr_payload || ticket.ticket_code, { margin: 1, width: 160 });
  const escapeHtml = (value) => String(value ?? "-").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(ticket.ticket_code)}</title><style>@page{size:80mm auto;margin:4mm}body{font-family:Arial,sans-serif;color:#111827;margin:0;width:72mm}.ticket{border:1px dashed #111827;padding:12px}.brand{text-align:center;border-bottom:1px solid #d1d5db;padding-bottom:8px}h1{font-size:18px;margin:0}.sub{font-size:11px;margin-top:3px}.title{text-align:center;font-weight:700;margin:12px 0;font-size:15px}.row{display:flex;justify-content:space-between;gap:8px;padding:4px 0;font-size:11px}.row span:first-child{color:#4b5563}.row strong{text-align:right}.total{border-top:1px solid #111827;margin-top:8px;padding-top:8px;font-size:16px}.qr{text-align:center;margin-top:12px}.qr img{width:100px;height:100px}.foot{text-align:center;border-top:1px solid #d1d5db;margin-top:10px;padding-top:8px;font-size:10px}</style></head><body><section class="ticket"><div class="brand"><h1>Panorama Jum</h1><div class="sub">Pass & Ride</div></div><div class="title">Ride / Pass Ticket</div><div class="row"><span>Ticket</span><strong>${escapeHtml(ticket.ticket_code)}</strong></div><div class="row"><span>Ride / Pass</span><strong>${escapeHtml(ticket.ride_name)}</strong></div><div class="row"><span>Type</span><strong>${escapeHtml(ticket.pricing_label)}</strong></div><div class="row"><span>Quantity</span><strong>${escapeHtml(ticket.quantity)}</strong></div><div class="row"><span>Child / Guest</span><strong>${escapeHtml(ticket.child_name || "-")}</strong></div><div class="row total"><span>Total</span><strong>৳${escapeHtml(ticket.total_amount)}</strong></div><div class="qr"><img src="${qr}" alt="Ticket QR"></div><div class="foot">Present this ticket at the ride gate. Thank you.</div></section><script>window.onload=()=>{window.focus();window.print()}</script></body></html>`);
  printWindow.document.close();
}
