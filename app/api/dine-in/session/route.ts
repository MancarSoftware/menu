import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getDiningTableSession, TABLE_SESSION_COOKIE } from "@/lib/table-session";

export async function DELETE(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });

    const table = await getDiningTableSession();
    if (table) {
      const activeOrders = await db.customerOrder.count({
        where: { diningTableId: table.id, status: { notIn: ["PAID", "CANCELLED"] } },
      });
      if (activeOrders > 0) {
        return NextResponse.json({ ended: false, error: "La mesa todavía tiene pedidos activos." }, { status: 409 });
      }
    }

    const response = NextResponse.json({ ended: true });
    response.cookies.set(TABLE_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
