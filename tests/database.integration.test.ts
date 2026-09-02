import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { toMenuItemView } from "@/lib/serializers";
import { productOptions } from "./fixtures/product";

if (process.env.ALLOW_DATABASE_TESTS !== "1") throw new Error("Database writes require npm run test:db and an approved disposable database.");

describe("database persistence", () => {
  const slug = `test-category-${Date.now()}`;
  let id = "";
  let itemId = "";

  afterAll(async () => { if (itemId) await db.menuItem.deleteMany({ where: { id: itemId } }); if (id) await db.menuCategory.deleteMany({ where: { id } }); await db.$disconnect(); });

  it("retrieves active categories in display order", async () => {
    const categories = await db.menuCategory.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } });
    expect(categories.map((category) => category.displayOrder)).toEqual([...categories.map((category) => category.displayOrder)].sort((a, b) => a - b));
  });
  it("persists category create and update operations", async () => {
    const created = await db.menuCategory.create({ data: { name: "Categoría temporal", slug, description: "Registro de integración", displayOrder: 999, isActive: false } });
    id = created.id;
    const updated = await db.menuCategory.update({ where: { id }, data: { name: "Categoría verificada" } });
    expect(updated.name).toBe("Categoría verificada");
    expect((await db.menuCategory.findUnique({ where: { id } }))?.isActive).toBe(false);
    const item = await db.menuItem.create({ data: { categoryId: id, name: "Producto temporal", slug: `${slug}-item`, shortDescription: "Prueba de opciones", description: "Producto aislado de integración", priceCents: 699, imageUrl: "/test.png", ingredients: JSON.stringify(["Carne", "Lechuga"]), customizationOptions: JSON.stringify(productOptions) } });
    itemId = item.id;
    const read = await db.menuItem.findUniqueOrThrow({ where: { id: itemId }, include: { category: true } });
    expect(toMenuItemView(read).customizationOptions).toEqual(productOptions);
    await db.menuItem.update({ where: { id: itemId }, data: { customizationOptions: JSON.stringify({ ...productOptions, extras: [], maxExtras: 0 }) } });
    const changed = await db.menuItem.findUniqueOrThrow({ where: { id: itemId }, include: { category: true } });
    expect(toMenuItemView(changed).customizationOptions?.extras).toEqual([]);
    expect(toMenuItemView(changed).customizationOptions?.maxExtras).toBe(0);
  });
});
