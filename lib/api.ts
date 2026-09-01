import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function assertSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  if (!host) return false;
  try {
    return new URL(origin).origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Revisa los campos marcados.", issues: error.issues }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return NextResponse.json({ error: "Ese nombre o identificador ya existe." }, { status: 409 });
    if (error.code === "P2003") return NextResponse.json({ error: "No se puede eliminar porque hay elementos relacionados." }, { status: 409 });
    if (error.code === "P2025") return NextResponse.json({ error: "El registro ya no existe." }, { status: 404 });
  }
  console.error(JSON.stringify({ level: "error", event: "api_error", message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined, timestamp: new Date().toISOString() }));
  return NextResponse.json({ error: "No pudimos completar la operación. Inténtalo de nuevo." }, { status: 500 });
}
