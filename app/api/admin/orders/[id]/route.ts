import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderInclude, toOrderView } from "@/lib/order-serializers";
import { orderStatusSchema } from "@/lib/validation";

const updateSchema = z.object({ status: orderStatusSchema, paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]).optional() });
const transitions: Record<string, string[]> = {
  RECEIVED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED"],
  SERVED: ["PAID"],
};

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminApi();
    if (!session) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const { id } = await context.params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId)) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    const input = updateSchema.parse(await request.json());
    const current = await db.customerOrder.findUniqueOrThrow({ where: { id: orderId } });
    if (!transitions[current.status]?.includes(input.status)) return NextResponse.json({ error: "Ese cambio de estado no está permitido." }, { status: 409 });
    if (input.status === "PAID" && !input.paymentMethod) return NextResponse.json({ error: "Selecciona el método de pago." }, { status: 400 });

    const order = await db.$transaction(async (transaction) => {
      const updated = await transaction.customerOrder.update({
        where: { id: orderId },
        data: {
          status: input.status,
          paymentStatus: input.status === "PAID" ? "PAID" : current.paymentStatus,
          paymentMethod: input.status === "PAID" ? input.paymentMethod : current.paymentMethod,
          statusHistory: { create: { status: input.status, actor: session.email } },
        },
        include: orderInclude,
      });
      if (["PAID", "CANCELLED"].includes(input.status) && current.diningTableId) {
        const remaining = await transaction.customerOrder.count({ where: { diningTableId: current.diningTableId, id: { not: orderId }, status: { notIn: ["PAID", "CANCELLED"] } } });
        if (remaining === 0) await transaction.diningTable.update({ where: { id: current.diningTableId }, data: { status: "CLEANING" } });
      }
      return updated;
    });
    return NextResponse.json({ order: toOrderView(order) });
  } catch (error) { return apiError(error); }
}
