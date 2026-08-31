import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { getTokenSecret } from "./token-secret";

export const TABLE_SESSION_COOKIE = "el_bueno_table_session";
const issuer = "el-bueno";

export async function createTableQrToken(table: { id: string; code: string }) {
  return new SignJWT({ code: table.code, purpose: "TABLE_QR" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience("table-qr")
    .setSubject(table.id)
    .setIssuedAt()
    .setExpirationTime("1825d")
    .sign(getTokenSecret());
}

export async function verifyTableQrToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getTokenSecret(), { issuer, audience: "table-qr" });
    if (!payload.sub || payload.purpose !== "TABLE_QR" || typeof payload.code !== "string") return null;
    return { tableId: payload.sub, code: payload.code };
  } catch {
    return null;
  }
}

export async function createTableSessionToken(table: { id: string; code: string }) {
  return new SignJWT({ code: table.code, purpose: "DINE_IN" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience("table-session")
    .setSubject(table.id)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getTokenSecret());
}

async function verifyTableSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getTokenSecret(), { issuer, audience: "table-session" });
    if (!payload.sub || payload.purpose !== "DINE_IN") return null;
    return { tableId: payload.sub };
  } catch {
    return null;
  }
}

export async function getDiningTableSession() {
  const token = (await cookies()).get(TABLE_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyTableSessionToken(token);
  if (!session) return null;
  return db.diningTable.findFirst({ where: { id: session.tableId, isActive: true } });
}
