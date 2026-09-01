import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { getBusinessDate, isBusinessDate } from "@/lib/business-date";
import { getAdminMetrics } from "@/lib/menu-repository";

export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    const date = request.nextUrl.searchParams.get("date") ?? getBusinessDate();
    if (!isBusinessDate(date)) return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
    return NextResponse.json({ metrics: await getAdminMetrics(date) });
  } catch (error) { return apiError(error); }
}
