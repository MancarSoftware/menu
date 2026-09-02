import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { toMenuItemView } from "@/lib/serializers";
import { menuItemSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const input = menuItemSchema.parse(await request.json());
    const item = await db.menuItem.create({ data: { ...input, customizationOptions: input.customizationOptions === undefined ? undefined : input.customizationOptions === null ? null : JSON.stringify(input.customizationOptions), dietaryTags: JSON.stringify(input.dietaryTags), ingredients: JSON.stringify(input.ingredients), allergens: JSON.stringify(input.allergens) }, include: { category: { select: { name: true, slug: true } } } });
    revalidatePath("/"); revalidatePath("/menu"); revalidatePath("/admin");
    return NextResponse.json({ item: toMenuItemView(item) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
