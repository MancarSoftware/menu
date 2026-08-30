import { expect, test } from "@playwright/test";

test("homepage leads into an interactive, searchable menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Fuego de origen/ })).toBeVisible();
  await page.getByRole("link", { name: /Explorar la carta/ }).click();
  await expect(page).toHaveURL(/\/menu/);
  await expect(page.getByRole("heading", { name: "Menú" })).toBeVisible();
  const search = page.getByPlaceholder("Buscar platos o ingredientes...");
  await search.fill("pulpo");
  await expect(page.getByRole("button", { name: /Pulpo a la brasa/ })).toBeVisible();
  await page.getByRole("button", { name: /Pulpo a la brasa/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pulpo a la brasa" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar detalle" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("mobile menu exposes persistent primary actions without horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile-only navigation check");
  await page.goto("/menu");
  await expect(page.getByRole("navigation", { name: "Acciones rápidas" })).toBeVisible();
  const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

test("menu category navigation remains usable", async ({ page }) => {
  await page.goto("/menu");
  await page.getByRole("link", { name: /Fuego lento/ }).first().click();
  await expect(page.locator("#fuego-lento")).toBeInViewport();
});

test("dish details support keyboard focus and Escape", async ({ page }) => {
  await page.goto("/menu");
  const firstDish = page.locator(".menu-dish").first();
  await firstDish.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerrar detalle" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(firstDish).toBeFocused();
});
