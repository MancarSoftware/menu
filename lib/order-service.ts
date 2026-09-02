import { Prisma } from "@prisma/client";
import { resolveProductCustomization } from "@/features/menu/product-options";
import { getBusinessDate } from "./business-date";
import { db } from "./db";
import type { DeliveryPoint, OrderMode } from "./domain";
import { orderInclude } from "./order-serializers";
import { parseArray } from "./serializers";

type RequestedItem = { productId: string; quantity: number; customizationKey: string };
type CreateOrderInput = {
  clientRequestId: string;
  mode: OrderMode;
  notes: string;
  items: RequestedItem[];
  diningTableId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryPoint?: DeliveryPoint;
};

export class OrderInputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function createCustomerOrder(input: CreateOrderInput) {
  const previous = await db.customerOrder.findUnique({ where: { clientRequestId: input.clientRequestId }, include: orderInclude });
  if (previous) {
    if (previous.mode !== input.mode || previous.diningTableId !== (input.diningTableId ?? null)) throw new OrderInputError("Identificador de pedido no válido.", 409);
    return { order: previous, created: false };
  }

  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const products = await db.menuItem.findMany({
    where: { id: { in: productIds }, isAvailable: true, category: { isActive: true } },
    include: { category: { select: { slug: true } } },
  });
  if (products.length !== productIds.length) throw new OrderInputError("Uno de los productos ya no está disponible.", 409);
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
  if (orderItems.some((item) => item === null)) throw new OrderInputError("Una personalización ya no es válida.");
  const validItems = orderItems.filter((item): item is NonNullable<typeof item> => item !== null);
  const subtotalCents = validItems.reduce((total, item) => total + item.lineTotalCents, 0);
  const serviceFeeCents = input.mode === "DELIVERY" ? 250 : 0;
  const businessDate = getBusinessDate();

  try {
    const order = await db.$transaction(async (transaction) => {
      const counter = await transaction.dailyOrderCounter.upsert({
        where: { businessDate },
        create: { businessDate, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      });
      const created = await transaction.customerOrder.create({
        data: {
          clientRequestId: input.clientRequestId,
          dailyNumber: counter.lastNumber,
          businessDate,
          diningTableId: input.diningTableId,
          mode: input.mode,
          status: "RECEIVED",
          subtotalCents,
          serviceFeeCents,
          totalCents: subtotalCents + serviceFeeCents,
          notes: input.notes,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          deliveryAddress: input.mode === "DELIVERY" ? input.deliveryAddress : null,
          deliveryLatitude: input.mode === "DELIVERY" ? input.deliveryPoint?.latitude : null,
          deliveryLongitude: input.mode === "DELIVERY" ? input.deliveryPoint?.longitude : null,
          items: { create: validItems },
          statusHistory: { create: { status: "RECEIVED", actor: "CUSTOMER" } },
        },
        include: orderInclude,
      });
      if (input.diningTableId) await transaction.diningTable.update({ where: { id: input.diningTableId }, data: { status: "OCCUPIED" } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { order, created: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.customerOrder.findUnique({ where: { clientRequestId: input.clientRequestId }, include: orderInclude });
      if (existing) return { order: existing, created: false };
    }
    throw error;
  }
}
