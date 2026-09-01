import { cache } from "react";
import { db } from "./db";
import { toMenuCategoryView, toMenuItemView, toRestaurantView } from "./serializers";
import { orderInclude, toDiningTableView, toOrderView } from "./order-serializers";
import { getBusinessDate, getBusinessDateRange } from "./business-date";

export const getRestaurant = cache(async () => {
  const restaurant = await db.restaurant.findUnique({ where: { id: 1 } });
  if (!restaurant) throw new Error("Restaurant configuration is missing. Run the database seed.");
  return toRestaurantView(restaurant);
});

export const getPublicMenu = cache(async () => {
  const categories = await db.menuCategory.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        where: { isAvailable: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        include: { category: { select: { name: true, slug: true } } },
      },
    },
  });
  return categories.map(toMenuCategoryView);
});

export const getFeaturedItems = cache(async () => {
  const items = await db.menuItem.findMany({
    where: { isFeatured: true, isAvailable: true, category: { isActive: true } },
    orderBy: [{ displayOrder: "asc" }],
    take: 5,
    include: { category: { select: { name: true, slug: true } } },
  });
  return items.map(toMenuItemView);
});

export async function getAdminMenu() {
  const categories = await db.menuCategory.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        include: { category: { select: { name: true, slug: true } } },
      },
    },
  });
  return categories.map(toMenuCategoryView);
}

export async function getDiningTables() {
  const tables = await db.diningTable.findMany({ orderBy: { number: "asc" } });
  return tables.map(toDiningTableView);
}

export async function getActiveOrders() {
  const orders = await db.customerOrder.findMany({
    where: { status: { notIn: ["PAID", "CANCELLED"] } },
    orderBy: { createdAt: "asc" },
    include: orderInclude,
  });
  return orders.map(toOrderView);
}

export async function getAdminMetrics(date = getBusinessDate()) {
  const { start, end } = getBusinessDateRange(date);
  const paidOrders = await db.customerOrder.aggregate({
    where: { paymentStatus: "PAID", paidAt: { gte: start, lt: end } },
    _sum: { totalCents: true },
    _count: { _all: true },
  });
  return {
    date,
    revenueCents: paidOrders._sum.totalCents ?? 0,
    paidOrderCount: paidOrders._count._all,
  };
}
