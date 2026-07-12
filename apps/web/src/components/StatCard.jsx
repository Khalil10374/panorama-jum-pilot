export default function StatCard({ label, value, icon: Icon, accent = "bg-lagoon" }) {
  const formatted = typeof value === "number" ? `৳${value.toLocaleString()}` : value;
  return (
    <div className="surface image-glass-card group relative overflow-hidden rounded-lg p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lift">
      <div className="absolute inset-x-0 top-0 h-1 bg-lagoon opacity-80" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-ink">{formatted}</p>
        </div>
        {Icon ? (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent} text-white shadow-sm transition group-hover:scale-105`}>
            <Icon size={22} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
