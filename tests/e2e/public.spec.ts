import { expect, test } from "@playwright/test";

test("homepage leads into the searchable fast-food menu", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Hambre en serio/ })).toBeVisible();
  await page.getByRole("link", { name: "Ver el menú", exact: true }).click();
  await expect(page).toHaveURL(/\/menu/);
  await expect(page.getByRole("heading", { name: "Menú" })).toBeVisible();

  const search = page.getByPlaceholder("Buscar platos...");
  await search.fill("doble");
  const product = page.getByRole("button", { name: "Ver detalles de Hamburguesa Doble" });
  await expect(product).toBeVisible();
  await product.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Hamburguesa Doble" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar detalle" }).click();
  await expect(dialog).not.toBeVisible();
});

test("mobile navigation stays visible without horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile-only navigation check");
  await page.goto("/menu");
  await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

test("menu categories remain usable", async ({ page }) => {
  await page.goto("/menu");
  await page.getByRole("link", { name: "Pizzas", exact: true }).click();
  await expect(page.locator("#pizzas")).toBeInViewport();
});

test("product details support keyboard focus and Escape", async ({ page }) => {
  await page.goto("/menu");
  const firstProduct = page.locator(".menu-product__detail").first();
  await firstProduct.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerrar detalle" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(firstProduct).toBeFocused();
});

test("customers can place a pickup order without location and recover it after navigation/reload", async ({ page }) => {
  await page.goto("/menu");
  await page.getByRole("button", { name: "Agregar Hamburguesa Clásica al carrito" }).click();
  await page.getByRole("link", { name: /Carrito/ }).click();
  await expect(page.getByRole("heading", { name: "Tu pedido" })).toBeVisible();
  await expect(page.getByText("Hamburguesa Clásica", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Retiro.*Gratis/ }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Cliente QA");
  await page.getByLabel("Teléfono", { exact: true }).fill("0990000000");
  await expect(page.getByLabel("Referencia de entrega (opcional)")).toHaveCount(0);
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await expect(page).toHaveURL(/\/pedido\//);
  const orderUrl = page.url();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tu pedido está en marcha" })).toBeVisible();
  await page.getByRole("link", { name: "Pedir algo más", exact: true }).click();
  await page.getByRole("link", { name: /Carrito/ }).click();
  await expect(page.getByRole("heading", { name: "Tus pedidos siguen aquí" })).toBeVisible();
  await expect(page.locator(`.cart-saved-orders a[href="${new URL(orderUrl).pathname}"]`)).toBeVisible();
});
