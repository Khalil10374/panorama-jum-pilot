import { useEffect, useState } from "react";
import Shell from "./components/Shell";
import { modules } from "./data/modules";
import { PILOT_OPERATIONAL_MODULE_KEYS, PILOT_OPERATIONAL_PAGE_KEYS } from "./config/pilot";
import { api, clearSession, getStoredUser, getToken } from "./lib/api";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ModulePage from "./pages/ModulePage";
import ParkingBillPrintPage from "./pages/ParkingBillPrintPage";

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [page, setPage] = useState("dashboard");
  const [checking, setChecking] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then(setUser)
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  function logout() {
    clearSession();
    setUser(null);
    setPage("dashboard");
  }

  function navigate(nextPage) {
    if (PILOT_OPERATIONAL_PAGE_KEYS.has(nextPage)) setPage(nextPage);
  }

  if (checking) return <div className="flex min-h-screen items-center justify-center text-slate-500">Checking session...</div>;
  if (!user) return <LoginPage onLogin={setUser} />;

  const parkingCheckoutId = new URLSearchParams(window.location.search).get("parkingCheckout");
  if (parkingCheckoutId) {
    return <ParkingBillPrintPage ticketId={parkingCheckoutId} onDone={() => setPage("parking")} />;
  }

  const activeModule = modules.find((item) => item.key === page && PILOT_OPERATIONAL_MODULE_KEYS.has(item.key));
  return (
    <Shell user={user} currentPage={page} onNavigate={navigate} onLogout={logout}>
      {page === "dashboard" ? <DashboardPage onNavigate={navigate} /> : null}
      {activeModule ? <ModulePage module={activeModule} user={user} /> : null}
    </Shell>
  );
}
