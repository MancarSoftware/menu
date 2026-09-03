import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderInclude, toOrderView } from "@/lib/order-serializers";
import { orderStatusSchema, paymentMethodSchema } from "@/lib/validation";
import { canDriverCollectPayment } from "@/lib/delivery";
import { staffDisplayName } from "@/lib/payment-labels";

const updateSchema = z.object({ status: orderStatusSchema, paymentMethod: paymentMethodSchema.optional(), version: z.number().int().positive(), reason: z.string().trim().min(4).max(240).optional() });
const transitions: Record<string, string[]> = {
  RECEIVED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "CANCELLED"],
  SERVED: ["PAID"],
};

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRoleApi(["ADMIN", "CASHIER", "WAITER", "KITCHEN", "DRIVER"]);
    if (!session) return NextResponse.json({ error: "Sesión expirada o sin permisos." }, { status: 401 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const { id } = await context.params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId)) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    const input = updateSchema.parse(await request.json());
    const current = await db.customerOrder.findUniqueOrThrow({ where: { id: orderId } });
    if (input.version !== current.version) return NextResponse.json({ error: "El pedido cambió. Actualiza la vista antes de continuar." }, { status: 409 });
    if (input.status === "CANCELLED") {
      if (!["ADMIN", "CASHIER"].includes(session.role)) return NextResponse.json({ error: "Caja o administración debe autorizar la cancelación." }, { status: 403 });
      if (!input.reason) return NextResponse.json({ error: "Indica el motivo de la cancelación." }, { status: 400 });
      if (current.paymentStatus !== "PENDING" || current.deliveryStatus === "OUT_FOR_DELIVERY") return NextResponse.json({ error: "No se cancela un pedido cobrado o en camino. Para un cobro usa el reembolso; para un reparto en camino registra una incidencia." }, { status: 409 });
    }
    const driverPayment = input.status === "PAID" && canDriverCollectPayment(current, session, input.paymentMethod);
    if (session.role === "DRIVER" && !driverPayment) return NextResponse.json({ error: "No tienes permiso para realizar esta operación." }, { status: 403 });
    if (current.mode === "DELIVERY" && input.status === "SERVED") return NextResponse.json({ error: "Confirma la entrega desde la sección Repartos." }, { status: 409 });
    if (!transitions[current.status]?.includes(input.status)) return NextResponse.json({ error: "Ese cambio de estado ya fue realizado o no está permitido." }, { status: 409 });
    if (input.status === "PAID" && !["ADMIN", "CASHIER"].includes(session.role) && !driverPayment) return NextResponse.json({ error: "Solo caja o personal autorizado puede registrar pagos." }, { status: 403 });
    if (input.status === "PAID" && !input.paymentMethod) return NextResponse.json({ error: "Selecciona el método de pago." }, { status: 400 });

    const openShift = input.status === "PAID" ? await db.cashRegisterShift.findFirst({ where: { status: "OPEN" }, orderBy: { openedAt: "desc" } }) : null;
    if (input.status === "PAID" && input.paymentMethod === "CASH" && !openShift) return NextResponse.json({ error: "Abre la caja antes de cobrar en efectivo." }, { status: 409 });

    const order = await db.$transaction(async (transaction) => {
      if (input.status === "PAID" && openShift) {
        const rows = await transaction.$queryRaw<{ status: string }[]>`SELECT "status" FROM "CashRegisterShift" WHERE "id" = ${openShift.id} FOR UPDATE`;
        if (rows[0]?.status !== "OPEN") throw new Error("SHIFT_CLOSED");
      }
      const changed = await transaction.customerOrder.updateMany({
        where: { id: orderId, status: current.status, version: input.version },
        data: {
          status: input.status,
          ...(input.status === "CANCELLED" ? { cancellationReason: input.reason } : {}),
          paymentStatus: input.status === "PAID" ? "PAID" : current.paymentStatus,
          paymentMethod: input.status === "PAID" ? input.paymentMethod : current.paymentMethod,
          paidAt: input.status === "PAID" ? new Date() : current.paidAt,
          acknowledgedAt: current.acknowledgedAt ?? new Date(),
          acknowledgedBy: current.acknowledgedBy ?? session.email,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new Error("ORDER_CONFLICT");
      await transaction.orderStatusHistory.create({ data: { orderId, status: input.status, actor: session.email } });
      if (input.status === "PAID" && input.paymentMethod) {
        await transaction.paymentEvent.create({
          data: { orderId, shiftId: openShift?.id, type: "PAYMENT", method: input.paymentMethod, amountCents: current.totalCents, actorUserId: session.id, actorName: staffDisplayName(session.name), cashCustody: input.paymentMethod === "CASH" ? (driverPayment ? "DRIVER" : "REGISTER") : null },
        });
      }
      await transaction.auditLog.create({
        data: { actorUserId: session.id, actorName: staffDisplayName(session.name), action: input.status === "PAID" ? "ORDER_PAYMENT_RECORDED" : "ORDER_STATUS_CHANGED", entityType: "CustomerOrder", entityId: String(orderId), details: JSON.stringify({ orderNumber: current.dailyNumber, businessDate: current.businessDate, from: current.status, to: input.status, paymentMethod: input.paymentMethod, reason: input.reason, ...(input.status === "PAID" ? { amountCents: current.totalCents } : {}) }) },
      });
      if (["PAID", "CANCELLED"].includes(input.status) && current.diningTableId) {
        const remaining = await transaction.customerOrder.count({ where: { diningTableId: current.diningTableId, id: { not: orderId }, status: { notIn: ["PAID", "CANCELLED"] } } });
        if (remaining === 0) await transaction.diningTable.updateMany({ where: { id: current.diningTableId, isActive: true }, data: { status: input.status === "PAID" ? "AVAILABLE" : "CLEANING" } });
      }
      return transaction.customerOrder.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    });
    return NextResponse.json({ order: toOrderView(order) });
  } catch (error) {
    if (error instanceof Error && error.message === "SHIFT_CLOSED") return NextResponse.json({ error: "La caja se cerró durante el cobro. Actualiza e inténtalo de nuevo." }, { status: 409 });
    if (error instanceof Error && error.message === "ORDER_CONFLICT") return NextResponse.json({ error: "Otro miembro del equipo actualizó este pedido. La vista se actualizará." }, { status: 409 });
    return apiError(error);
  }
}
