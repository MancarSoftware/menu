import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordSchema, staffRoleSchema } from "@/lib/validation";

const schema = z.object({ role: staffRoleSchema.optional(), isActive: z.boolean().optional(), password: passwordSchema.optional() }).refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRoleApi(["ADMIN"]);
    if (!session) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    if (id === session.id && input.isActive === false) return NextResponse.json({ error: "No puedes desactivar tu propia cuenta." }, { status: 400 });
    const data = { ...(input.role ? { role: input.role } : {}), ...(input.isActive !== undefined ? { isActive: input.isActive } : {}), ...(input.password ? { passwordHash: await hash(input.password, 12), mustChangePassword: true, passwordChangedAt: new Date() } : {}) };
    const user = await db.adminUser.update({ where: { id }, data });
    await db.auditLog.create({ data: { actorUserId: session.id, actorName: session.email, action: input.password ? "STAFF_PASSWORD_RESET" : "STAFF_UPDATED", entityType: "AdminUser", entityId: id, details: JSON.stringify({ role: input.role, isActive: input.isActive }) } });
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive, mustChangePassword: user.mustChangePassword, lastLoginAt: user.lastLoginAt?.toISOString() ?? null } });
  } catch (error) { return apiError(error); }
}
