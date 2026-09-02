import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordSchema, staffRoleSchema } from "@/lib/validation";

const schema = z.object({ role: staffRoleSchema.optional(), isActive: z.boolean().optional(), password: passwordSchema.optional(), canCollectCash: z.boolean().optional(), canCollectCard: z.boolean().optional(), canCollectTransfer: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRoleApi(["ADMIN"]);
    if (!session) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    if (id === session.id && input.isActive === false) return NextResponse.json({ error: "No puedes desactivar tu propia cuenta." }, { status: 400 });
    const data = { ...(input.role ? { role: input.role } : {}), ...(input.isActive !== undefined ? { isActive: input.isActive } : {}), ...(input.password ? { passwordHash: await hash(input.password, 12), mustChangePassword: true, passwordChangedAt: new Date() } : {}) };
    const user = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "AdminUser" WHERE "id" = ${id} FOR UPDATE`;
      const current = await tx.adminUser.findUniqueOrThrow({ where: { id } });
      if (current.role === "DRIVER" && (input.isActive === false || (input.role && input.role !== "DRIVER"))) {
        const assigned = await tx.customerOrder.count({ where: { assignedDriverId: id, status: { notIn: ["PAID", "CANCELLED"] } } });
        if (assigned) return null;
      }
      const updated = await tx.adminUser.update({ where: { id }, data: { ...data, canCollectCash: (input.role ?? current.role) === "DRIVER" ? input.canCollectCash ?? current.canCollectCash : false, canCollectCard: (input.role ?? current.role) === "DRIVER" ? input.canCollectCard ?? current.canCollectCard : false, canCollectTransfer: (input.role ?? current.role) === "DRIVER" ? input.canCollectTransfer ?? current.canCollectTransfer : false } });
      await tx.auditLog.create({ data: { actorUserId: session.id, actorName: session.email, action: input.password ? "STAFF_PASSWORD_RESET" : "STAFF_UPDATED", entityType: "AdminUser", entityId: id, details: JSON.stringify({ role: input.role, isActive: input.isActive, canCollectCash: updated.canCollectCash, canCollectCard: updated.canCollectCard, canCollectTransfer: updated.canCollectTransfer }) } });
      return updated;
    });
    if (!user) return NextResponse.json({ error: "Reasigna o cierra los pedidos pendientes del repartidor antes de desactivar o cambiar su rol." }, { status: 409 });
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive, canCollectCash: user.canCollectCash, canCollectCard: user.canCollectCard, canCollectTransfer: user.canCollectTransfer, mustChangePassword: user.mustChangePassword, lastLoginAt: user.lastLoginAt?.toISOString() ?? null } });
  } catch (error) { return apiError(error); }
}
