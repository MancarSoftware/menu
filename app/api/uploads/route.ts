import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, apiError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";

const allowedTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
const MAX_SIZE = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminApi())) return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    if (!assertSameOrigin(request)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecciona una imagen." }, { status: 400 });
    const extension = allowedTypes.get(file.type);
    if (!extension || file.size > MAX_SIZE) return NextResponse.json({ error: "Usa JPG, PNG o WebP de máximo 8 MB." }, { status: 400 });

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (cloudName && apiKey && apiSecret) {
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = "brasa-norte/menu";
      const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
      const cloudData = new FormData();
      cloudData.set("file", file); cloudData.set("api_key", apiKey); cloudData.set("timestamp", String(timestamp)); cloudData.set("folder", folder); cloudData.set("signature", signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: cloudData });
      if (!response.ok) throw new Error("Cloudinary rejected image upload");
      const result = await response.json() as { secure_url: string };
      return NextResponse.json({ url: result.secure_url });
    }

    if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Configura Cloudinary para subir imágenes en producción." }, { status: 503 });
    const directory = path.join(process.cwd(), "public", "uploads");
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) { return apiError(error); }
}
