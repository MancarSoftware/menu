import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { db } from "@/lib/db";
import { categorySchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const input = categorySchema.parse(await request.json());
    const category = await db.menuCategory.create({ data: input });
    revalidatePath("/"); revalidatePath("/menu"); revalidatePath("/admin");
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) { return apiError(error); }
}
