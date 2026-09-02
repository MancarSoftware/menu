"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Truck, UserRoundCog } from "lucide-react";
import { requestJson } from "./admin-api";
import { DeliveryBoard } from "./delivery-board";
import { StaffManager } from "./staff-manager";

export function DriverDashboard() {
  const router = useRouter();
  const [account, setAccount] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    try { await requestJson("/api/auth/logout", "POST"); router.replace("/admin/login"); router.refresh(); }
    catch { setError("No pudimos cerrar la sesión. Inténtalo otra vez."); }
  }
  return <div className="driver-dashboard"><header><h1><Truck aria-hidden="true" />Repartidor</h1><nav aria-label="Secciones del repartidor"><button className="button button--line" aria-pressed={!account} onClick={() => setAccount(false)}>Mis entregas</button><button className="button button--line" aria-pressed={account} onClick={() => setAccount(true)}><UserRoundCog aria-hidden="true" />Mi acceso</button><button className="button button--line" onClick={() => void logout()}><LogOut aria-hidden="true" />Salir</button></nav></header>{error && <p role="alert">{error}</p>}<div hidden={account}><DeliveryBoard manager={false} /></div>{account && <StaffManager canManage={false} />}</div>;
}
