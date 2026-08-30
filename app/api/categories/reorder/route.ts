import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) });

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const { ids } = schema.parse(await request.json());
    await db.$transaction(ids.map((id, displayOrder) => db.menuCategory.update({ where: { id }, data: { displayOrder } })));
    revalidatePath("/menu"); revalidatePath("/admin");
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
