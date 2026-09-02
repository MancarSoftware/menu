import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireRoleApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordSchema, staffRoleSchema } from "@/lib/validation";

const createSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.email(), role: staffRoleSchema, password: passwordSchema, canCollectCash: z.boolean().default(false) });
const view = (user: { id: string; email: string; name: string; role: string; isActive: boolean; canCollectCash: boolean; mustChangePassword: boolean; lastLoginAt: Date | null }) => ({ id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive, canCollectCash: user.canCollectCash, mustChangePassword: user.mustChangePassword, lastLoginAt: user.lastLoginAt?.toISOString() ?? null });

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
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.find((issue) => issue.path[0] === "password");
      return NextResponse.json({ error: passwordIssue?.message ?? "Revisa el nombre, correo, rol y contraseña." }, { status: 400 });
    }
    const input = { ...parsed.data, email: parsed.data.email.toLowerCase() };
    if (await db.adminUser.findUnique({ where: { email: input.email } })) return NextResponse.json({ error: "Ya existe un usuario con ese correo." }, { status: 409 });
    const passwordHash = await hash(input.password, 12);
    const user = await db.$transaction(async (transaction) => {
      const created = await transaction.adminUser.create({ data: { name: input.name, email: input.email, role: input.role, canCollectCash: input.role === "DRIVER" && input.canCollectCash, passwordHash, isActive: true, mustChangePassword: true, passwordChangedAt: new Date() } });
      await transaction.auditLog.create({ data: { actorUserId: session.id, actorName: session.email, action: "STAFF_CREATED", entityType: "AdminUser", entityId: created.id, details: JSON.stringify({ email: created.email, role: created.role }) } });
      return created;
    });
    return NextResponse.json({ user: view(user) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
