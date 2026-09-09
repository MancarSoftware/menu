import { Prisma } from "@prisma/client";
import { resolveProductCustomization } from "@/features/menu/product-options";
import { getBusinessDate } from "./business-date";
import { db } from "./db";
import type { DeliveryPoint, OrderMode } from "./domain";
import { orderInclude } from "./order-serializers";
import { parseArray } from "./serializers";
import { parseProductOptions } from "./product-customization";

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

const MAX_TRANSACTION_ATTEMPTS = 4;

async function findPreviousOrder(input: CreateOrderInput) {
  const order = await db.customerOrder.findUnique({ where: { clientRequestId: input.clientRequestId }, include: orderInclude });
  if (order && (order.mode !== input.mode || order.diningTableId !== (input.diningTableId ?? null))) {
    throw new OrderInputError("Identificador de pedido no válido.", 409);
  }
  return order;
}

export async function createCustomerOrder(input: CreateOrderInput) {
  const previous = await findPreviousOrder(input);
  if (previous) return { order: previous, created: false };

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
    const customization = resolveProductCustomization({ categorySlug: product.category.slug, ingredients: parseArray(product.ingredients), customizationOptions: parseProductOptions(product.customizationOptions) }, requestedItem.customizationKey);
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
  if (orderItems.some((item) => item === null)) throw new OrderInputError("Las opciones de un producto cambiaron. Retíralo del carrito y vuelve a agregarlo desde el menú.", 409);
  const validItems = orderItems.filter((item): item is NonNullable<typeof item> => item !== null);
  const subtotalCents = validItems.reduce((total, item) => total + item.lineTotalCents, 0);
  const serviceFeeCents = input.mode === "DELIVERY" ? 250 : 0;
  const businessDate = getBusinessDate();

  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      const createdOrder = await db.$transaction(async (transaction) => {
        // One statement keeps the counter lock short even with a remote database.
        // All inserts and the table update roll back together on any constraint error.
        // ReadCommitted lets queued increments see the latest committed counter.
        const [created] = await transaction.$queryRaw<{ id: number }[]>`
          WITH counter AS (
            INSERT INTO "DailyOrderCounter" ("businessDate", "lastNumber", "updatedAt")
            VALUES (${businessDate}, 1, CURRENT_TIMESTAMP)
            ON CONFLICT ("businessDate") DO UPDATE
            SET "lastNumber" = "DailyOrderCounter"."lastNumber" + 1,
                "updatedAt" = CURRENT_TIMESTAMP
            RETURNING "lastNumber"
          ), new_order AS (
            INSERT INTO "CustomerOrder" (
              "publicId", "clientRequestId", "dailyNumber", "businessDate", "diningTableId",
              "mode", "status", "subtotalCents", "serviceFeeCents", "totalCents", "notes",
              "customerName", "customerPhone", "deliveryAddress", "deliveryLatitude", "deliveryLongitude", "updatedAt"
            )
            SELECT gen_random_uuid()::text, ${input.clientRequestId}, "lastNumber", ${businessDate}, ${input.diningTableId ?? null},
              ${input.mode}, 'RECEIVED', ${subtotalCents}, ${serviceFeeCents}, ${subtotalCents + serviceFeeCents}, ${input.notes},
              ${input.customerName ?? null}, ${input.customerPhone ?? null},
              ${input.mode === "DELIVERY" ? input.deliveryAddress ?? null : null},
              ${input.mode === "DELIVERY" ? input.deliveryPoint?.latitude ?? null : null},
              ${input.mode === "DELIVERY" ? input.deliveryPoint?.longitude ?? null : null}, CURRENT_TIMESTAMP
            FROM counter
            RETURNING "id"
          ), new_items AS (
            INSERT INTO "OrderItem" (
              "id", "orderId", "productId", "productName", "quantity", "basePriceCents",
              "extraPriceCents", "unitPriceCents", "lineTotalCents", "customization"
            )
            SELECT gen_random_uuid()::text, new_order."id", item.*
            FROM new_order CROSS JOIN jsonb_to_recordset(${JSON.stringify(validItems)}::jsonb) AS item(
              "productId" text, "productName" text, "quantity" integer, "basePriceCents" integer,
              "extraPriceCents" integer, "unitPriceCents" integer, "lineTotalCents" integer, "customization" text
            )
          ), initial_history AS (
            INSERT INTO "OrderStatusHistory" ("id", "orderId", "status", "actor")
            SELECT gen_random_uuid()::text, "id", 'RECEIVED', 'CUSTOMER' FROM new_order
          ), occupied_table AS (
            UPDATE "DiningTable" SET "status" = 'OCCUPIED', "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = ${input.diningTableId ?? null} AND EXISTS (SELECT 1 FROM new_order)
          )
          SELECT "id" FROM new_order
        `;
        return created;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 5000, timeout: 15000 });
      // Load the response after commit so relation reads do not hold the counter lock.
      const order = await db.customerOrder.findUniqueOrThrow({ where: { id: createdOrder.id }, include: orderInclude });
      return { order, created: true };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
      // Raw SQL reports SQLSTATE via P2010; Prisma-managed transactions may use P2034.
      const sqlState = error.code === "P2010" ? String(error.meta?.code) : null;
      const conflict = error.code === "P2034" || sqlState === "40001" || sqlState === "40P01";
      if (error.code === "P2002" || sqlState === "23505" || conflict) {
        const existing = await findPreviousOrder(input);
        if (existing) return { order: existing, created: false };
      }
      if (!conflict) throw error;
      if (attempt === MAX_TRANSACTION_ATTEMPTS - 1) {
        throw new OrderInputError("Hay muchos pedidos al mismo tiempo. Espera unos segundos y vuelve a intentar sin cambiar tu pedido.", 503);
      }
      await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt + Math.floor(Math.random() * 50)));
    }
  }
  throw new OrderInputError("No pudimos registrar el pedido. Vuelve a intentarlo.", 503);
}
