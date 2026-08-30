import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { toRestaurantView } from "@/lib/serializers";
import { restaurantSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const input = restaurantSchema.parse(await request.json());
    const restaurant = await db.restaurant.update({ where: { id: 1 }, data: { ...input, openingHours: JSON.stringify(input.openingHours), socialLinks: JSON.stringify(input.socialLinks) } });
    revalidatePath("/"); revalidatePath("/menu"); revalidatePath("/admin");
    return NextResponse.json({ restaurant: toRestaurantView(restaurant) });
  } catch (error) { return apiError(error); }
}
