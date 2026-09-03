import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, apiError } from "@/lib/api";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";

const MAX_ATTEMPTS = 8;
const BLOCK_MINUTES = 15;

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    const input = loginSchema.parse(await request.json());
    const email = input.email.toLowerCase();
    const throttleKey = `${ip}:${email}`;
    const throttle = await db.loginThrottle.findUnique({ where: { key: throttleKey } });
    if (throttle?.blockedUntil && throttle.blockedUntil > new Date()) return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
    const user = await db.adminUser.findUnique({ where: { email } });
    const valid = user ? await compare(input.password, user.passwordHash) : false;
    if (!user || !user.isActive || !valid) {
      const windowExpired = !throttle || throttle.lastAttemptAt.getTime() < Date.now() - BLOCK_MINUTES * 60_000 || Boolean(throttle.blockedUntil && throttle.blockedUntil <= new Date());
      const failedAttempts = (windowExpired ? 0 : throttle.failedAttempts) + 1;
      await db.loginThrottle.upsert({
        where: { key: throttleKey },
        create: { key: throttleKey, failedAttempts, blockedUntil: failedAttempts >= MAX_ATTEMPTS ? new Date(Date.now() + BLOCK_MINUTES * 60_000) : null },
        update: { failedAttempts, blockedUntil: failedAttempts >= MAX_ATTEMPTS ? new Date(Date.now() + BLOCK_MINUTES * 60_000) : null, lastAttemptAt: new Date() },
      });
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }
    await Promise.all([
      createSession(user),
      db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      db.loginThrottle.deleteMany({ where: { key: throttleKey } }),
      db.auditLog.create({ data: { actorUserId: user.id, actorName: user.name, action: "AUTH_LOGIN", entityType: "AdminUser", entityId: user.id } }),
    ]);
    return NextResponse.json({ ok: true, mustChangePassword: user.mustChangePassword });
  } catch (error) { return apiError(error); }
}
