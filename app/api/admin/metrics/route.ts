import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { getBusinessDate, isBusinessDate } from "@/lib/business-date";
import { getAdminMetrics } from "@/lib/menu-repository";

export async function GET(request: NextRequest) {
  try {
    if (!(await requireRoleApi(["ADMIN", "CASHIER"]))) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    const date = request.nextUrl.searchParams.get("date") ?? getBusinessDate();
    if (!isBusinessDate(date)) return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
    return NextResponse.json({ metrics: await getAdminMetrics(date) });
  } catch (error) { return apiError(error); }
}
