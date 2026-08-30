import { describe, expect, it } from "vitest";
import { formatPrice, slugify } from "@/lib/format";

describe("formatting", () => {
  it("normalizes accented product names into stable slugs", () => expect(slugify("  Sándwich Clásico / Pollo ")).toBe("sandwich-clasico-pollo"));
  it("formats prices as Dominican pesos", () => expect(formatPrice(35000)).toBe("RD$350"));
});
