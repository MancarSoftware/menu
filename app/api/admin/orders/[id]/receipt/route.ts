import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { getOrderReceipt } from "@/lib/order-receipt";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRoleApi(["ADMIN", "CASHIER", "WAITER", "KITCHEN", "DRIVER"]);
    if (!session) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    const receipt = await getOrderReceipt(Number((await context.params).id), session);
    if (!receipt) return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    return NextResponse.json(receipt, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
