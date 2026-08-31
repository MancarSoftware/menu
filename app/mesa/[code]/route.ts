import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createTableSessionToken, TABLE_SESSION_COOKIE, verifyTableQrToken } from "@/lib/table-session";

export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Código de mesa incompleto." }, { status: 400 });

  const access = await verifyTableQrToken(token);
  if (!access || access.code !== code) return NextResponse.json({ error: "Este código de mesa no es válido." }, { status: 403 });
  const table = await db.diningTable.findFirst({ where: { id: access.tableId, code, isActive: true } });
  if (!table) return NextResponse.json({ error: "Esta mesa no está disponible." }, { status: 404 });

  const sessionToken = await createTableSessionToken(table);
  const response = NextResponse.redirect(new URL("/menu", request.url));
  response.cookies.set(TABLE_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
