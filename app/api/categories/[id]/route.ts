import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { categorySchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const { id } = await context.params;
    const input = categorySchema.parse(await request.json());
    const category = await db.menuCategory.update({ where: { id }, data: input });
    revalidatePath("/"); revalidatePath("/menu"); revalidatePath("/admin");
    return NextResponse.json({ category });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const { id } = await context.params;
    await db.menuCategory.delete({ where: { id } });
    revalidatePath("/menu"); revalidatePath("/admin");
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
