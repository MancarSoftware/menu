import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { deliveryActionError } from "@/lib/delivery";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ASSIGN"), driverId: z.string().min(1), version: z.number().int().positive() }),
  z.object({ action: z.enum(["DISPATCH", "DELIVER"]), version: z.number().int().positive() }),
  z.object({ action: z.enum(["REPORT_ISSUE", "RETRY"]), reason: z.string().trim().min(4).max(240), version: z.number().int().positive() }),
]);
class DeliveryError extends Error {}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRoleApi(["ADMIN", "CASHIER", "DRIVER"]);
    if (!session) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const id = Number((await context.params).id);
    if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    const input = schema.parse(await request.json());
    await db.$transaction(async (tx) => {
      const order = await tx.customerOrder.findUniqueOrThrow({ where: { id } });
      if (input.version !== order.version) throw new DeliveryError("El pedido cambió. Actualiza la vista antes de continuar.");
      const error = deliveryActionError(order, session, input.action);
      if (error) throw new DeliveryError(error);
      if (input.action === "ASSIGN") {
        // Lock the staff row so deactivation cannot race assignment.
        await tx.$queryRaw`SELECT "id" FROM "AdminUser" WHERE "id" = ${input.driverId} FOR UPDATE`;
        const driver = await tx.adminUser.findFirst({ where: { id: input.driverId, role: "DRIVER", isActive: true } });
        if (!driver) throw new DeliveryError("Selecciona un repartidor activo.");
      }
      const changed = await tx.customerOrder.updateMany({
        where: { id, version: input.version, status: order.status, assignedDriverId: order.assignedDriverId, deliveryStatus: order.deliveryStatus },
        data: {
          ...(input.action === "ASSIGN" ? { assignedDriverId: input.driverId } : input.action === "REPORT_ISSUE" ? { deliveryStatus: "FAILED", deliveryIssue: input.reason } : input.action === "RETRY" ? { deliveryStatus: "PENDING", deliveryIssue: null, dispatchedAt: null } : input.action === "DISPATCH" ? { deliveryStatus: "OUT_FOR_DELIVERY", dispatchedAt: new Date() } : { deliveryStatus: "DELIVERED", deliveredAt: new Date(), status: "SERVED" }),
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new DeliveryError("Otro miembro actualizó este pedido. Actualiza la vista e inténtalo de nuevo.");
      if (input.action === "DELIVER") await tx.orderStatusHistory.create({ data: { orderId: id, status: "SERVED", actor: session.email } });
      await tx.auditLog.create({ data: { actorUserId: session.id, actorName: session.name, action: `DELIVERY_${input.action}`, entityType: "CustomerOrder", entityId: String(id), details: JSON.stringify({ previousDriverId: order.assignedDriverId, ...("reason" in input ? { reason: input.reason } : {}), ...(input.action === "ASSIGN" ? { driverId: input.driverId } : {}) }) } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DeliveryError) return NextResponse.json({ error: error.message }, { status: 409 });
    return apiError(error);
  }
}
