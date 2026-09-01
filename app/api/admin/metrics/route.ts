import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { getAdminMetrics } from "@/lib/menu-repository";

export async function GET() {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    return NextResponse.json({ metrics: await getAdminMetrics() });
  } catch (error) { return apiError(error); }
}
