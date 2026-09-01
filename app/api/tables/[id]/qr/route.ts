import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { apiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTableQrToken } from "@/lib/table-session";

function escapeXml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character);
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    const { id } = await context.params;
    const [table, restaurant] = await Promise.all([
      db.diningTable.findUniqueOrThrow({ where: { id } }),
      db.restaurant.findUnique({ where: { id: 1 }, select: { name: true } }),
    ]);
    const token = await createTableQrToken(table);
    const tableUrl = new URL(`/mesa/${table.code}`, request.nextUrl.origin);
    tableUrl.searchParams.set("token", token);
    const qrCode = await QRCode.toString(tableUrl.toString(), {
      type: "svg",
      width: 228,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#11100e", light: "#ffffff" },
    });
    const qrData = Buffer.from(qrCode, "utf8").toString("base64");
    const restaurantName = escapeXml((restaurant?.name ?? "El Bueno").toUpperCase());
    const tableName = escapeXml(table.name);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="560" viewBox="0 0 420 560" role="img" aria-labelledby="title description">
  <title id="title">Código QR de la Mesa ${table.number}</title>
  <desc id="description">Escanea para abrir el menú y ordenar desde ${tableName}.</desc>
  <rect width="420" height="560" rx="24" fill="#fff7e8"/>
  <path d="M0 0h420v14H0z" fill="#ff4b2b"/>
  <path d="M316 14h104v104L316 14Z" fill="#ffc928"/>
  <circle cx="370" cy="68" r="19" fill="#11100e"/>
  <path d="M361 69h18M370 60v18" stroke="#fff7e8" stroke-width="3" stroke-linecap="round"/>
  <text x="32" y="54" fill="#11100e" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="800" letter-spacing="1.8">${restaurantName}</text>
  <text x="32" y="101" fill="#11100e" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="31" font-weight="900">¡Bienvenido!</text>
  <text x="32" y="132" fill="#ff4b2b" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="25" font-weight="900">Ordena aquí</text>
  <rect x="32" y="158" width="356" height="294" rx="20" fill="#ffffff" stroke="#11100e" stroke-width="3"/>
  <image x="96" y="179" width="228" height="228" href="data:image/svg+xml;base64,${qrData}"/>
  <rect x="137" y="416" width="146" height="48" rx="24" fill="#ffc928" stroke="#11100e" stroke-width="3"/>
  <text x="210" y="447" text-anchor="middle" fill="#11100e" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="21" font-weight="900">MESA ${table.number}</text>
  <text x="210" y="500" text-anchor="middle" fill="#11100e" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700">Escanea con la cámara de tu celular</text>
  <text x="210" y="526" text-anchor="middle" fill="#716b61" font-family="Arial, Helvetica, sans-serif" font-size="11">Pide, revisa tu orden y sigue su estado.</text>
</svg>`;
    return new NextResponse(svg, { headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `inline; filename="mesa-${table.number}-qr.svg"`,
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; img-src data:",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return apiError(error); }
}
