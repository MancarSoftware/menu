import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, apiError } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    const now = Date.now();
    const current = attempts.get(ip);
    if (current && current.resetAt > now && current.count >= 8) return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
    if (!current || current.resetAt <= now) attempts.set(ip, { count: 0, resetAt: now + 15 * 60 * 1000 });

    const input = loginSchema.parse(await request.json());
    const user = await db.adminUser.findUnique({ where: { email: input.email.toLowerCase() } });
    const valid = user ? await compare(input.password, user.passwordHash) : false;
    if (!user || !valid) {
      const entry = attempts.get(ip)!;
      entry.count += 1;
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }
    attempts.delete(ip);
    await Promise.all([createSession(user), db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })]);
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
