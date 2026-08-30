import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  await destroySession();
  return NextResponse.json({ ok: true });
}
