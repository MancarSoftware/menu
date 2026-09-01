import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { getTokenSecret } from "./token-secret";
import type { StaffRole } from "./domain";

const COOKIE_NAME = "el_bueno_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;
const STAFF_ROLES: StaffRole[] = ["ADMIN", "CASHIER", "WAITER", "KITCHEN"];

export async function createSession(user: { id: string; email: string; role: string }) {
  const token = await new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getTokenSecret());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getTokenSecret());
    const role = String(payload.role) as StaffRole;
    if (!payload.sub || !STAFF_ROLES.includes(role)) return null;
    return { id: payload.sub, email: String(payload.email), role };
  } catch {
    return null;
  }
}

export async function requireAdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requireAdminApi() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function requireRoleApi(roles: StaffRole[]) {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) return null;
  return session;
}
