import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    if (!(await requireRoleApi(["ADMIN"]))) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    const entries = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json({ entries: entries.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })) });
  } catch (error) { return apiError(error); }
}
