import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBusinessDateRange, isBusinessDate } from "@/lib/business-date";
import { auditDetails, toAuditEntry } from "@/lib/audit-view";

export async function GET(request?: Request) {
  try {
    if (!(await requireRoleApi(["ADMIN"]))) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    const params = new URL(request?.url ?? "http://localhost/api/admin/audit").searchParams;
    const from = params.get("from") ?? "", to = params.get("to") ?? "", actorId = params.get("actorId") ?? "", action = params.get("action") ?? "";
    const page = Number(params.get("page") ?? 1), orderId = params.has("orderId") ? Number(params.get("orderId")) : null;
    if ((from && !isBusinessDate(from)) || (to && !isBusinessDate(to)) || (from && to && from > to) || !Number.isSafeInteger(page) || page < 1 || page > 100000 || actorId.length > 100 || (action && !/^[A-Z_]{1,80}$/.test(action)) || (orderId !== null && (!Number.isSafeInteger(orderId) || orderId < 1))) return NextResponse.json({ error: "Revisa las fechas y los filtros de auditoría." }, { status: 400 });
    const paymentIds = orderId === null ? [] : await db.paymentEvent.findMany({ where: { orderId }, select: { id: true } });
    const where: Prisma.AuditLogWhereInput = {
      ...(from || to ? { createdAt: { ...(from ? { gte: getBusinessDateRange(from).start } : {}), ...(to ? { lt: getBusinessDateRange(to).end } : {}) } } : {}),
      ...(actorId ? { actorUserId: actorId } : {}), ...(action ? { action } : {}),
      ...(orderId !== null ? { OR: [{ entityType: "CustomerOrder", entityId: String(orderId) }, { entityType: "PaymentEvent", entityId: { in: paymentIds.map((payment) => payment.id) } }] } : {}),
    };
    const pageSize = 25;
    const [entries, total] = await Promise.all([
      db.auditLog.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pageSize, skip: (page - 1) * pageSize }), db.auditLog.count({ where }),
    ]);
    const paymentEvents = await db.paymentEvent.findMany({ where: { id: { in: entries.filter((entry) => entry.entityType === "PaymentEvent").map((entry) => entry.entityId) } }, select: { id: true, amountCents: true, order: { select: { id: true, dailyNumber: true, businessDate: true } } } });
    const payments = new Map(paymentEvents.map((payment) => [payment.id, payment]));
    const ids = entries.filter((entry) => entry.entityType === "CustomerOrder").map((entry) => Number(entry.entityId)).filter((id) => Number.isSafeInteger(id) && id > 0);
    const userIds = [...new Set(entries.flatMap((entry) => {
      const data = auditDetails(entry.details);
      return [entry.actorUserId, entry.entityType === "AdminUser" ? entry.entityId : null, typeof data.driverId === "string" ? data.driverId : null].filter((id): id is string => !!id);
    }))];
    const [orders, users] = await Promise.all([
      db.customerOrder.findMany({ where: { id: { in: ids } }, select: { id: true, dailyNumber: true, businessDate: true, totalCents: true } }),
      db.adminUser.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }),
    ]);
    const orderMap = new Map(orders.map((order) => [order.id, order]));
    const names = new Map(users.map((user) => [user.id, user.name]));
    return NextResponse.json({ entries: entries.map((entry) => {
      const data = auditDetails(entry.details), payment = payments.get(entry.entityId);
      const order = entry.entityType === "CustomerOrder" ? orderMap.get(Number(entry.entityId)) : entry.entityType === "PaymentEvent" ? payment?.order : null;
      return toAuditEntry(entry, { actorName: names.get(entry.actorUserId ?? ""), driverName: typeof data.driverId === "string" ? names.get(data.driverId) : undefined, subjectName: entry.entityType === "AdminUser" ? names.get(entry.entityId) : undefined, order: order ? { id: order.id, orderNumber: order.dailyNumber, businessDate: order.businessDate } : null, amountCents: entry.entityType === "PaymentEvent" ? payment?.amountCents : entry.action === "ORDER_PAYMENT_RECORDED" ? orderMap.get(Number(entry.entityId))?.totalCents : undefined });
    }), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
