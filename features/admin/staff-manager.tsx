"use client";

import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { StaffRole, StaffUserView } from "@/lib/domain";
import { requestJson } from "./admin-api";
import { AuditPanel } from "./audit-panel";

const collectionPermissions = [{ key: "canCollectCash", label: "Efectivo" }, { key: "canCollectCard", label: "Tarjeta verificada" }, { key: "canCollectTransfer", label: "Transferencia verificada" }] as const;
const roles: { value: StaffRole; label: string }[] = [{ value: "ADMIN", label: "Administrador" }, { value: "CASHIER", label: "Caja" }, { value: "WAITER", label: "Mesero" }, { value: "KITCHEN", label: "Cocina" }, { value: "DRIVER", label: "Repartidor" }];

export function StaffManager({ canManage }: { canManage: boolean }) {
  const [users, setUsers] = useState<StaffUserView[]>([]);
  const [form, setForm] = useState({ name: "", email: "", role: "WAITER" as StaffRole, password: "" });
  const [collection, setCollection] = useState({ canCollectCash: false, canCollectCard: false, canCollectTransfer: false });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { try { const staff = await requestJson<{ users: StaffUserView[] }>("/api/admin/staff"); setUsers(staff.users); } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos cargar el equipo."); } }, []);
  useEffect(() => { if (!canManage) return; const timeout = window.setTimeout(load, 0); return () => window.clearTimeout(timeout); }, [canManage, load]);
  useEffect(() => { if (!message) return; const timeout = window.setTimeout(() => setMessage(""), 5000); return () => window.clearTimeout(timeout); }, [message]);

  async function create(event: React.FormEvent) { event.preventDefault(); if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password)) { setMessage("La contraseña temporal necesita mayúscula, minúscula y número."); return; } try { await requestJson("/api/admin/staff", "POST", { ...form, ...(form.role === "DRIVER" ? collection : {}) }); setForm({ name: "", email: "", role: "WAITER", password: "" }); setCollection({ canCollectCash: false, canCollectCard: false, canCollectTransfer: false }); setMessage("Usuario creado. Deberá cambiar su contraseña al ingresar."); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos crear el usuario."); } }
  async function update(user: StaffUserView, data: { role?: StaffRole; isActive?: boolean; password?: string; canCollectCash?: boolean; canCollectCard?: boolean; canCollectTransfer?: boolean }) { try { await requestJson(`/api/admin/staff/${user.id}`, "PATCH", data); setMessage("Usuario actualizado."); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos actualizar el usuario."); } }
  async function changePassword(event: React.FormEvent) { event.preventDefault(); try { await requestJson("/api/admin/password", "PATCH", passwords); setPasswords({ currentPassword: "", newPassword: "" }); setMessage("Tu contraseña fue actualizada."); } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos actualizar la contraseña."); } }
  async function resetDemo() { if (window.prompt('Escribe "RESET DEMO" para borrar pedidos y caja de staging:') !== "RESET DEMO") return; try { await requestJson("/api/admin/demo-reset", "POST", { confirmation: "RESET DEMO" }); setMessage("Los datos operativos de staging fueron reiniciados."); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos reiniciar la demo."); } }

  return <div className="staff-manager">
    {message && <p className="admin-inline-message">{message}</p>}
    {canManage && <section className="staff-list"><header><p className="eyebrow">Acceso por función</p><h2>Equipo del local</h2></header>{users.map((user) => <article key={user.id} data-inactive={!user.isActive}>
      <span><strong>{user.name}</strong><small>{user.email}</small></span>
      <select aria-label={`Rol de ${user.name}`} value={user.role} onChange={(event) => update(user, { role: event.target.value as StaffRole })}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select>
      <button className="admin-status-button" data-active={user.isActive} onClick={() => update(user, { isActive: !user.isActive })}>{user.isActive ? "Activo" : "Inactivo"}</button>
      <button className="button button--line" onClick={() => { const password = window.prompt("Contraseña temporal (mínimo 12 caracteres, mayúscula, minúscula y número):"); if (password) void update(user, { password }); }}><KeyRound />Restablecer</button>
      {user.role === "DRIVER" && <fieldset className="staff-collection-permissions"><legend>Cobros autorizados para {user.name}</legend>{collectionPermissions.map(({ key, label }) => <label key={key} className="staff-cash-permission"><input type="checkbox" checked={user[key]} onChange={(event) => void update(user, { [key]: event.target.checked })} />{label}</label>)}<small>Solo pagos recibidos o verificados de sus propias entregas.</small></fieldset>}
    </article>)}</section>}
    <section className="staff-forms">{canManage && <form className="admin-editor" onSubmit={create}><header><UserPlus /><div><p className="eyebrow">Nuevo acceso</p><h2>Agregar usuario</h2></div></header><label>Nombre<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Correo<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>Rol<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as StaffRole })}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>{form.role === "DRIVER" && <fieldset className="staff-collection-permissions"><legend>Métodos de cobro autorizados</legend>{collectionPermissions.map(({ key, label }) => <label className="staff-cash-permission" key={key}><input type="checkbox" checked={collection[key]} onChange={(event) => setCollection({ ...collection, [key]: event.target.checked })} />{label}</label>)}</fieldset>}<label>Contraseña temporal<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={12} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{12,}" title="Mínimo 12 caracteres, con mayúscula, minúscula y número." required /></label><p className="admin-form-help">Mínimo 12 caracteres, con mayúscula, minúscula y número.</p><button className="button button--solid">Crear acceso</button></form>}
      <form className="admin-editor" onSubmit={changePassword}><header><ShieldCheck /><div><p className="eyebrow">Seguridad personal</p><h2>Cambiar mi contraseña</h2></div></header><label>Contraseña actual<input type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} required /></label><label>Nueva contraseña<input type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} minLength={12} required /></label><p className="admin-form-help">Mínimo 12 caracteres, con mayúscula, minúscula y número.</p><button className="button button--solid">Actualizar contraseña</button></form></section>
    {canManage && <><AuditPanel users={users} /><details className="staff-demo-tools"><summary>Mantenimiento de la demo</summary><p>Solo para staging. No forma parte de la operación diaria del restaurante.</p><button className="button button--line" onClick={resetDemo}>Reiniciar demo de staging</button></details></>}
  </div>;
}
