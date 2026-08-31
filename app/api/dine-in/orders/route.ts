import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { orderInclude, toOrderView } from "@/lib/order-serializers";
import { parseArray } from "@/lib/serializers";
import { getDiningTableSession } from "@/lib/table-session";
import { dineInOrderSchema } from "@/lib/validation";
import { resolveProductCustomization } from "@/features/menu/product-options";

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const table = await getDiningTableSession();
    if (!table) return NextResponse.json({ error: "Escanea nuevamente el código QR de tu mesa." }, { status: 401 });
    const input = dineInOrderSchema.parse(await request.json());

    const previous = await db.customerOrder.findUnique({ where: { clientRequestId: input.clientRequestId }, include: orderInclude });
    if (previous) {
      if (previous.diningTableId !== table.id) return NextResponse.json({ error: "Identificador de pedido no válido." }, { status: 409 });
      return NextResponse.json({ order: toOrderView(previous) });
    }

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await db.menuItem.findMany({ where: { id: { in: productIds }, isAvailable: true, category: { isActive: true } }, include: { category: { select: { slug: true } } } });
    if (products.length !== productIds.length) return NextResponse.json({ error: "Uno de los productos ya no está disponible." }, { status: 409 });
    const productMap = new Map(products.map((product) => [product.id, product]));

    const orderItems = input.items.map((requestedItem) => {
      const product = productMap.get(requestedItem.productId);
      if (!product) return null;
      const customization = resolveProductCustomization({ categorySlug: product.category.slug, ingredients: parseArray(product.ingredients) }, requestedItem.customizationKey);
      if (!customization) return null;
      const unitPriceCents = product.priceCents + customization.extraPriceCents;
      return {
        productId: product.id,
        productName: product.name,
        quantity: requestedItem.quantity,
        basePriceCents: product.priceCents,
        extraPriceCents: customization.extraPriceCents,
        unitPriceCents,
        lineTotalCents: unitPriceCents * requestedItem.quantity,
        customization: JSON.stringify(customization.labels),
      };
    });
    if (orderItems.some((item) => item === null)) return NextResponse.json({ error: "Una personalización ya no es válida." }, { status: 400 });
    const validItems = orderItems.filter((item): item is NonNullable<typeof item> => item !== null);
    const subtotalCents = validItems.reduce((total, item) => total + item.lineTotalCents, 0);

    const order = await db.$transaction(async (transaction) => {
      const created = await transaction.customerOrder.create({
        data: {
          clientRequestId: input.clientRequestId,
          diningTableId: table.id,
          mode: "DINE_IN",
          status: "RECEIVED",
          subtotalCents,
          totalCents: subtotalCents,
          notes: input.notes,
          items: { create: validItems },
          statusHistory: { create: { status: "RECEIVED", actor: "CUSTOMER" } },
        },
        include: orderInclude,
      });
      await transaction.diningTable.update({ where: { id: table.id }, data: { status: "OCCUPIED" } });
      return created;
    });

    return NextResponse.json({ order: toOrderView(order) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
