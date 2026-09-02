import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { getTokenSecret } from "./token-secret";
import type { StaffRole } from "./domain";
import { db } from "./db";

const COOKIE_NAME = "el_bueno_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;
const STAFF_ROLES: StaffRole[] = ["ADMIN", "CASHIER", "WAITER", "KITCHEN", "DRIVER"];

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
    if (!payload.sub) return null;
    const user = await db.adminUser.findUnique({ where: { id: payload.sub }, select: { id: true, name: true, email: true, role: true, isActive: true, canCollectCash: true, canCollectCard: true, canCollectTransfer: true, passwordChangedAt: true } });
    if (!user?.isActive || !STAFF_ROLES.includes(user.role as StaffRole)) return null;
    if (user.passwordChangedAt && (!payload.iat || payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000))) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role as StaffRole, canCollectCash: user.canCollectCash, canCollectCard: user.canCollectCard, canCollectTransfer: user.canCollectTransfer };
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
