"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "No pudimos iniciar sesión.");
      router.push("/admin"); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No pudimos iniciar sesión."); }
    finally { setPending(false); }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <div className="form-field"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" inputMode="email" autoComplete="username" maxLength={254} required /></div>
      <div className="form-field"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" autoComplete="current-password" minLength={8} maxLength={200} required /></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button--solid" type="submit" disabled={pending}>{pending ? "Verificando…" : "Entrar al panel"}</button>
    </form>
  );
}
