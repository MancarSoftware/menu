import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";

describe("database persistence", () => {
  const slug = `test-category-${Date.now()}`;
  let id = "";

  afterAll(async () => { if (id) await db.menuCategory.deleteMany({ where: { id } }); await db.$disconnect(); });

  it("retrieves active categories in display order", async () => {
    const categories = await db.menuCategory.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } });
    expect(categories.length).toBeGreaterThan(0);
    expect(categories.map((category) => category.displayOrder)).toEqual([...categories.map((category) => category.displayOrder)].sort((a, b) => a - b));
  });
  it("persists category create and update operations", async () => {
    const created = await db.menuCategory.create({ data: { name: "Categoría temporal", slug, description: "Registro de integración", displayOrder: 999, isActive: false } });
    id = created.id;
    const updated = await db.menuCategory.update({ where: { id }, data: { name: "Categoría verificada" } });
    expect(updated.name).toBe("Categoría verificada");
    expect((await db.menuCategory.findUnique({ where: { id } }))?.isActive).toBe(false);
  });
});
