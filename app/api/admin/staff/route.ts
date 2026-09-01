import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordSchema, staffRoleSchema } from "@/lib/validation";

const createSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.email(), role: staffRoleSchema, password: passwordSchema });
const view = (user: { id: string; email: string; name: string; role: string; isActive: boolean; mustChangePassword: boolean; lastLoginAt: Date | null }) => ({ ...user, lastLoginAt: user.lastLoginAt?.toISOString() ?? null });

export async function GET() {
  try {
    if (!(await requireRoleApi(["ADMIN"]))) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    const users = await db.adminUser.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
    return NextResponse.json({ users: users.map(view) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRoleApi(["ADMIN"]);
    if (!session) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const input = createSchema.parse(await request.json());
    const user = await db.adminUser.create({ data: { name: input.name, email: input.email.toLowerCase(), role: input.role, passwordHash: await hash(input.password, 12), mustChangePassword: true } });
    await db.auditLog.create({ data: { actorUserId: session.id, actorName: session.email, action: "STAFF_CREATED", entityType: "AdminUser", entityId: user.id, details: JSON.stringify({ email: user.email, role: user.role }) } });
    return NextResponse.json({ user: view(user) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
