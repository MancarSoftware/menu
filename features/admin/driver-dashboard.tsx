"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Truck, UserRoundCog } from "lucide-react";
import { requestJson, SessionExpiredError } from "./admin-api";
import { useLiveRefresh } from "./use-live-refresh";
import { DeliveryBoard } from "./delivery-board";
import { StaffManager } from "./staff-manager";
import { CashHandovers } from "./cash-handovers";

export function DriverDashboard() {
  const router = useRouter();
  const [view, setView] = useState<"deliveries" | "cash" | "account">("deliveries");
  const [error, setError] = useState("");
  const [showCash, setShowCash] = useState(false);
  const [cashError, setCashError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const refreshCashVisibility = useCallback(async () => {
    try {
      const result = await requestJson<{ visible: boolean }>("/api/admin/cash-handovers");
      setShowCash(result.visible); setCashError("");
    } catch (reason) {
      if (reason instanceof SessionExpiredError) router.replace("/admin/login");
      setCashError("No pudimos consultar el efectivo pendiente. Reintentaremos al recuperar la conexión.");
    }
  }, [router]);
  useLiveRefresh(refreshCashVisibility);
  const currentView = view === "cash" && !showCash ? "deliveries" : view;
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await requestJson("/api/auth/logout", "POST"); router.replace("/admin/login"); router.refresh(); }
    catch { setError("No pudimos cerrar la sesión. Inténtalo otra vez."); setLoggingOut(false); }
  }
  return <div className="driver-dashboard"><header><h1><Truck aria-hidden="true" />Repartidor</h1><nav aria-label="Secciones del repartidor"><button className="button button--line" aria-pressed={currentView === "deliveries"} onClick={() => setView("deliveries")}>Mis entregas</button>{showCash && <button className="button button--line" aria-pressed={currentView === "cash"} onClick={() => setView("cash")}>Efectivo por entregar</button>}<button className="button button--line" aria-pressed={currentView === "account"} onClick={() => setView("account")}><UserRoundCog aria-hidden="true" />Mi acceso</button><button className="button button--line" disabled={loggingOut} onClick={() => void logout()}><LogOut aria-hidden="true" />{loggingOut ? "Saliendo…" : "Salir"}</button></nav></header>{error && <p role="alert">{error}</p>}{cashError && <p role="status">{cashError}</p>}<div hidden={currentView !== "deliveries"}><DeliveryBoard manager={false} /></div>{currentView === "cash" && <CashHandovers manager={false} />}{currentView === "account" && <StaffManager canManage={false} />}</div>;
}
