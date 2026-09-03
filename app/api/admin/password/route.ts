import { compare, hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { createSession, requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordSchema } from "@/lib/validation";

const schema = z.object({ currentPassword: z.string().min(8).max(200), newPassword: passwordSchema });

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireRoleApi(["ADMIN", "CASHIER", "WAITER", "KITCHEN", "DRIVER"]);
    if (!session) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const input = schema.parse(await request.json());
    const user = await db.adminUser.findUniqueOrThrow({ where: { id: session.id } });
    if (!(await compare(input.currentPassword, user.passwordHash))) return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 400 });
    const passwordHash = await hash(input.newPassword, 12);
    await db.$transaction([
      db.adminUser.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date() } }),
      db.auditLog.create({ data: { actorUserId: user.id, actorName: user.name, action: "PASSWORD_CHANGED", entityType: "AdminUser", entityId: user.id } }),
    ]);
    await createSession(user);
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
