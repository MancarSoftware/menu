import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { apiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTableQrToken } from "@/lib/table-session";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    const { id } = await context.params;
    const table = await db.diningTable.findUniqueOrThrow({ where: { id } });
    const token = await createTableQrToken(table);
    const tableUrl = new URL(`/mesa/${table.code}`, request.nextUrl.origin);
    tableUrl.searchParams.set("token", token);
    const svg = await QRCode.toString(tableUrl.toString(), { type: "svg", width: 640, margin: 2, color: { dark: "#11100e", light: "#fff7e8" } });
    return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": `inline; filename="mesa-${table.number}.svg"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
