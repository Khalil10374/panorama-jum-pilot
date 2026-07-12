import {
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  Search
} from "lucide-react";
import { modules } from "../data/modules";
import { PILOT_OPERATIONAL_MODULE_KEYS } from "../config/pilot";
import Button from "./Button";

export default function Shell({ user, currentPage, onNavigate, onLogout, children }) {
  const visibleModules = modules.filter((item) => item.roles.includes(user.role) || user.role === "Super Admin");
  const operationModules = visibleModules.filter((item) => PILOT_OPERATIONAL_MODULE_KEYS.has(item.key));
  return (
    <div className="app-bg min-h-screen lg:flex">
      <aside className="sidebar-shell no-print fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 text-white lg:block">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <img src="/panorama-logo.png" alt="Panorama Jum logo" className="h-12 w-12 rounded-lg bg-white/80 object-contain p-1 shadow-sm" />
          <div>
            <p className="font-bold text-white">Panorama Jum</p>
            <p className="text-xs font-medium text-teal-100/80">Pilot Project · 3 Modules</p>
          </div>
        </div>
        <nav className="thin-scrollbar h-[calc(100vh-5rem)] overflow-y-auto p-4">
          <SidebarButton active={currentPage === "dashboard"} icon={LayoutDashboard} label="Dashboard" onClick={() => onNavigate("dashboard")} />
          <div className="my-4 border-t border-white/10" />
          {operationModules.map((item) => (
            <SidebarButton
              key={item.key}
              active={currentPage === item.key}
              icon={item.icon}
              label={item.title}
              onClick={() => onNavigate(item.key)}
            />
          ))}
        </nav>
      </aside>

      <div className="min-h-screen flex-1 lg:pl-72">
        <header className="top-glass no-print sticky top-0 z-20 border-b border-teal-100/80 shadow-sm">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="soft" className="h-10 w-10 px-0 lg:hidden" title="Menu">
                <Menu size={18} />
              </Button>
              <img src="/panorama-logo.png" alt="Panorama Jum logo" className="h-10 w-10 rounded-lg bg-white/80 object-contain p-1 shadow-sm lg:hidden" />
              <div className="min-w-0 lg:hidden">
                <p className="truncate text-sm font-black text-ink">Panorama Jum</p>
                <p className="truncate text-xs font-semibold text-slate-500">{user.role}</p>
              </div>
              <div className="field-shell hidden h-10 min-w-[300px] items-center gap-2 rounded-lg px-3 md:flex">
                <Search size={17} className="text-slate-400" />
                <span className="text-sm text-slate-500">Search records inside each module</span>
              </div>
              <button className="hidden items-center gap-2 text-sm font-semibold text-slate-500 lg:flex" onClick={() => onNavigate("dashboard")}>
                <ChevronLeft size={16} />
                Back to overview
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-ink">{user.name}</p>
                <p className="text-xs font-medium text-slate-500">{user.role}</p>
              </div>
              <Button variant="soft" className="h-10 w-10 px-0" onClick={onLogout} title="Logout">
                <LogOut size={18} />
              </Button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
            <MobileButton active={currentPage === "dashboard"} icon={LayoutDashboard} label="Dashboard" onClick={() => onNavigate("dashboard")} />
            {operationModules.map((item) => (
              <MobileButton key={item.key} active={currentPage === item.key} icon={item.icon} label={item.title} onClick={() => onNavigate(item.key)} />
            ))}
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
        active ? "border border-white/30 bg-white/14 text-white shadow-sm backdrop-blur-md" : "text-teal-50/90 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function MobileButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
        active ? "border-white/30 bg-white/16 text-white" : "border-white/25 bg-white/10 text-white/80 backdrop-blur-md"
      }`}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}
