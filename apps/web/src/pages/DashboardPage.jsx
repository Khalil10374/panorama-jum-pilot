import { Bike, CarFront, ReceiptText, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import StatCard from "../components/StatCard";
import { api } from "../lib/api";

const pilotLabels = ["This Month's Total Income", "Parking Income", "Ride Income"];
const icons = [ReceiptText, CarFront, Bike];
const colors = ["bg-lagoon", "bg-coral", "bg-coral"];

export default function DashboardPage({ onNavigate }) {
  const [data, setData] = useState({ stats: [], low_stock: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(setData).finally(() => setLoading(false));
  }, []);

  const pilotStats = data.stats.filter((item) => pilotLabels.includes(item.label));
  const chartData = pilotStats
    .filter((item) => typeof item.value === "number")
    .map((item) => ({ name: item.label.replace("This Month's ", ""), amount: item.value }));

  if (loading) return <p className="text-slate-500">Loading dashboard...</p>;

  return (
    <div className="grid gap-6">
      <section className="resort-hero rounded-lg p-6 text-white shadow-lift md:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
          <div className="min-w-0">
            <span className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-white backdrop-blur">
              <Sparkles size={14} /> Main dashboard
            </span>
            <h1 className="max-w-3xl text-3xl font-black leading-tight md:text-5xl">Panorama Jum Pilot Dashboard</h1>
            <p className="mt-3 max-w-2xl text-white/85">Parking Automation and Pass & Ride activity at a glance.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {pilotStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-white/25 bg-slate-950/35 p-4 backdrop-blur">
                <p className="text-xs font-semibold text-white/90">{stat.label}</p>
                <p className="mt-2 text-xl font-black">{typeof stat.value === "number" ? `৳${stat.value.toLocaleString()}` : stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {pilotStats.map((stat, index) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={icons[index]} accent={colors[index]} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="surface rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-ink">Monthly Revenue Mix</h2>
              <p className="text-sm text-slate-500">Income stream comparison for the current month</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `৳${Number(value).toLocaleString()}`} />
                <Bar dataKey="amount" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface rounded-lg p-5">
          <h2 className="mb-1 text-lg font-black text-ink">Pilot Scope</h2>
          <p className="mb-4 text-sm text-slate-500">Only these operational areas are enabled for this pilot.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={() => onNavigate("parking")} className="glass-chip rounded-lg p-4 text-left transition hover:-translate-y-1">
              <p className="font-black text-ink">Parking Automation</p>
              <p className="mt-1 text-sm text-slate-500">Entry, checkout and history</p>
            </button>
            <button onClick={() => onNavigate("rides")} className="glass-chip rounded-lg p-4 text-left transition hover:-translate-y-1">
              <p className="font-black text-ink">Pass & Ride</p>
              <p className="mt-1 text-sm text-slate-500">Ticket sale and validation</p>
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <button onClick={() => onNavigate("parking")} className="surface image-glass-card flex items-center gap-3 rounded-lg p-4 text-left transition hover:-translate-y-1 hover:border-lagoon">
          <span className="glass-chip flex h-10 w-10 items-center justify-center rounded-lg text-lagoon"><CarFront size={20} /></span>
          <span className="font-bold text-ink">Open Parking Automation</span>
        </button>
        <button onClick={() => onNavigate("rides")} className="surface image-glass-card flex items-center gap-3 rounded-lg p-4 text-left transition hover:-translate-y-1 hover:border-lagoon">
          <span className="glass-chip flex h-10 w-10 items-center justify-center rounded-lg text-lagoon"><Bike size={20} /></span>
          <span className="font-bold text-ink">Open Pass & Ride</span>
        </button>
      </section>
    </div>
  );
}
