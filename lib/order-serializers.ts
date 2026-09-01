import { Prisma } from "@prisma/client";
import type { DiningTableStatus, DiningTableView, OrderStatus, OrderView } from "./domain";
import { parseArray } from "./serializers";

export const orderInclude = {
  diningTable: true,
  items: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.CustomerOrderInclude;

type OrderWithDetails = Prisma.CustomerOrderGetPayload<{ include: typeof orderInclude }>;

export function toDiningTableView(table: { id: string; code: string; number: number; name: string; capacity: number; status: string; isActive: boolean }): DiningTableView {
  return { ...table, status: table.status as DiningTableStatus };
}

export function toOrderView(order: OrderWithDetails): OrderView {
  return {
    id: order.id,
    orderNumber: order.dailyNumber,
    businessDate: order.businessDate,
    publicId: order.publicId,
    mode: "DINE_IN",
    status: order.status as OrderStatus,
    paymentStatus: order.paymentStatus as "PENDING" | "PAID",
    paymentMethod: order.paymentMethod,
    subtotalCents: order.subtotalCents,
    totalCents: order.totalCents,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    table: order.diningTable ? { id: order.diningTable.id, number: order.diningTable.number, name: order.diningTable.name } : null,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
      customization: parseArray(item.customization),
    })),
  };
}
