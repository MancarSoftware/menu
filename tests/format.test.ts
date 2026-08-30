import { describe, expect, it } from "vitest";
import { formatPrice, slugify } from "@/lib/format";

describe("formatting", () => {
  it("normalizes accented dish names into stable slugs", () => expect(slugify("  Cacao 70 / Sal de Mira ")).toBe("cacao-70-sal-de-mira"));
  it("formats prices as Ecuadorian US dollars", () => expect(formatPrice(1550)).toContain("15,50"));
});
