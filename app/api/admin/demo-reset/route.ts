import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ confirmation: z.literal("RESET DEMO") });

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoleApi(["ADMIN"]);
    if (!session) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    if (process.env.VERCEL_ENV !== "preview" && process.env.ALLOW_DEMO_RESET !== "true") return NextResponse.json({ error: "El reinicio solo está disponible en staging." }, { status: 403 });
    schema.parse(await request.json());
    await db.$transaction(async (transaction) => {
      await transaction.paymentEvent.deleteMany();
      await transaction.orderStatusHistory.deleteMany();
      await transaction.orderItem.deleteMany();
      await transaction.customerOrder.deleteMany();
      await transaction.cashRegisterShift.deleteMany();
      await transaction.dailyOrderCounter.deleteMany();
      await transaction.diningTable.updateMany({ where: { isActive: true }, data: { status: "AVAILABLE" } });
      await transaction.auditLog.deleteMany();
      await transaction.auditLog.create({ data: { actorUserId: session.id, actorName: session.name, action: "DEMO_DATA_RESET", entityType: "System", entityId: "staging" } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
