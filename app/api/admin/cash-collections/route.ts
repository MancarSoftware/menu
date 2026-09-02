import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { getBusinessDate, isBusinessDate } from "@/lib/business-date";
import { getCashCollections } from "@/lib/cash-collections";

export async function GET(request: NextRequest) {
  try {
    if (!(await requireRoleApi(["ADMIN", "CASHIER"]))) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    const date = request.nextUrl.searchParams.get("date") ?? getBusinessDate();
    const rawPage = request.nextUrl.searchParams.get("page") ?? "1";
    const page = Number(rawPage);
    if (!isBusinessDate(date) || !/^\d+$/.test(rawPage) || !Number.isSafeInteger(page) || page < 1) {
      return NextResponse.json({ error: "Selecciona una fecha y una página válidas." }, { status: 400 });
    }
    const collections = await getCashCollections(date, page);
    return NextResponse.json({ collections }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
