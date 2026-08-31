import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { toDiningTableView } from "@/lib/order-serializers";
import { diningTableSchema, diningTableStatusSchema } from "@/lib/validation";

const tableUpdateSchema = diningTableSchema.partial().extend({ status: diningTableStatusSchema.optional() });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const { id } = await context.params;
    const input = tableUpdateSchema.parse(await request.json());
    const existing = await db.diningTable.findUniqueOrThrow({ where: { id } });
    if (input.isActive === false && existing.status === "OCCUPIED") {
      const activeOrders = await db.customerOrder.count({ where: { diningTableId: id, status: { notIn: ["PAID", "CANCELLED"] } } });
      if (activeOrders > 0) return NextResponse.json({ error: "Finaliza o cancela los pedidos activos antes de desactivar la mesa." }, { status: 409 });
    }
    const isActive = input.isActive ?? existing.isActive;
    const status = !isActive ? "INACTIVE" : input.status ?? (existing.status === "INACTIVE" ? "AVAILABLE" : existing.status);
    const table = await db.diningTable.update({ where: { id }, data: { ...input, isActive, status } });
    return NextResponse.json({ table: toDiningTableView(table) });
  } catch (error) { return apiError(error); }
}
