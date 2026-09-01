import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, apiError } from "@/lib/api";
import { createCustomerOrder, OrderInputError } from "@/lib/order-service";
import { toOrderView } from "@/lib/order-serializers";
import { publicOrderSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const input = publicOrderSchema.parse(await request.json());
    const result = await createCustomerOrder(input);
    return NextResponse.json({ order: toOrderView(result.order) }, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof OrderInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    return apiError(error);
  }
}
