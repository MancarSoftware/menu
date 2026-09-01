import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, apiError } from "@/lib/api";
import { toOrderView } from "@/lib/order-serializers";
import { getDiningTableSession } from "@/lib/table-session";
import { dineInOrderSchema } from "@/lib/validation";
import { createCustomerOrder, OrderInputError } from "@/lib/order-service";

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const table = await getDiningTableSession();
    if (!table) return NextResponse.json({ error: "Escanea nuevamente el código QR de tu mesa." }, { status: 401 });
    const input = dineInOrderSchema.parse(await request.json());

    const result = await createCustomerOrder({ ...input, mode: "DINE_IN", diningTableId: table.id });
    return NextResponse.json({ order: toOrderView(result.order) }, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof OrderInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    return apiError(error);
  }
}
