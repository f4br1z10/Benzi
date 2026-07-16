import { test, expect } from "@playwright/test";

test("crea cliente, preventivo a tre righe e PDF", async ({ page, request }) => {
  const stamp = Date.now();
  await page.goto("/clienti");
  await page.getByRole("button", { name: "+ Crea cliente" }).click();
  const modal = page.locator(".modal");
  await modal.locator('[name="firstName"]').fill("E2E");
  await modal.locator('[name="lastName"]').fill(`Cliente ${stamp}`);
  await modal.locator('[name="phone"]').fill("0612345678");
  await modal.locator('[name="addresses.0.city"]').fill("Albano Laziale");
  await modal.locator('[name="addresses.1.city"]').fill("Albano Laziale");
  await page.getByRole("button", { name: "Salva cliente" }).click();
  await expect(page.getByText("Cliente salvato correttamente")).toBeVisible();

  await page.goto("/preventivi/nuovo");
  const customerSelect = page.locator('select[name="customerId"]');
  const optionValue = await customerSelect.locator("option").filter({ hasText: `E2E Cliente ${stamp}` }).getAttribute("value");
  await customerSelect.selectOption(optionValue!);
  await page.getByRole("button", { name: /2\. Informazioni/ }).click();
  await page.locator('[name="subject"]').fill("Test end-to-end");
  await page.getByRole("button", { name: /3\. Prodotti e servizi/ }).click();
  const products = await (await request.get("/api/products")).json();
  const productSelect = page.locator("select").filter({ hasText: "+ Aggiungi prodotto" }).first();
  for (const product of products.slice(0, 3)) await productSelect.selectOption(String(product.id));
  await expect(page.locator(".quote-line").filter({ has: page.locator("textarea") })).toHaveCount(4);
  await page.getByRole("button", { name: /6\. Anteprima/ }).click();
  await page.getByRole("button", { name: "Salva ed emetti" }).click();
  await page.waitForURL(/\/preventivi\/\d+$/);
  const id = Number(page.url().split("/").pop());
  expect(id).toBeGreaterThan(0);
  const generated = await request.post(`/api/quotes/${id}/pdf`);
  expect(generated.ok()).toBeTruthy();
  const pdf = await request.get(`/api/quotes/${id}/pdf`);
  expect(pdf.ok()).toBeTruthy();
  expect((await pdf.body()).length).toBeGreaterThan(10000);
});
