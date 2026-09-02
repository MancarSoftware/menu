import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { toMenuItemView } from "@/lib/serializers";
import { menuItemSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const { id } = await context.params;
    const input = menuItemSchema.parse(await request.json());
    const item = await db.menuItem.update({ where: { id }, data: { ...input, customizationOptions: input.customizationOptions === undefined ? undefined : input.customizationOptions === null ? null : JSON.stringify(input.customizationOptions), dietaryTags: JSON.stringify(input.dietaryTags), ingredients: JSON.stringify(input.ingredients), allergens: JSON.stringify(input.allergens) }, include: { category: { select: { name: true, slug: true } } } });
    revalidatePath("/"); revalidatePath("/menu"); revalidatePath("/admin");
    return NextResponse.json({ item: toMenuItemView(item) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const { id } = await context.params;
    await db.menuItem.delete({ where: { id } });
    revalidatePath("/"); revalidatePath("/menu"); revalidatePath("/admin");
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
