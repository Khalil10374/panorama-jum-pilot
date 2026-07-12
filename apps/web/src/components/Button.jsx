export default function Button({ children, className = "", variant = "primary", ...props }) {
  const variants = {
    primary: "bg-lagoon text-white shadow-sm hover:bg-teal-800",
    dark: "bg-ink text-white shadow-sm hover:bg-slate-800",
    soft: "bg-white/10 text-white border border-white/25 backdrop-blur-md hover:border-teal-200/70 hover:bg-white/18",
    danger: "bg-coral text-white shadow-sm hover:bg-rose-700",
    success: "bg-leaf text-white shadow-sm hover:bg-green-700"
  };
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
