import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { toDiningTableView } from "@/lib/order-serializers";
import { diningTableSchema } from "@/lib/validation";

export async function GET() {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    const tables = await db.diningTable.findMany({ orderBy: { number: "asc" } });
    return NextResponse.json({ tables: tables.map(toDiningTableView) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const input = diningTableSchema.parse(await request.json());
    const table = await db.diningTable.create({ data: { ...input, code: `mesa-${input.number}-${randomUUID().slice(0, 8)}`, status: input.isActive ? "AVAILABLE" : "INACTIVE" } });
    return NextResponse.json({ table: toDiningTableView(table) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
