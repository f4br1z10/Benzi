import { test, expect } from "@playwright/test";

test("aggiorna il totale quando si cambia il prezzo di un servizio inizialmente a zero", async ({ page }) => {
  await page.goto("/preventivi/nuovo");
  await page.getByRole("button", { name: /3\. Prodotti e servizi/ }).click();

  const serviceSelect = page.locator("select").filter({ hasText: "+ Aggiungi servizio" }).first();
  const firstServiceId = await serviceSelect.locator("option").nth(1).getAttribute("value");
  await serviceSelect.selectOption(firstServiceId!);

  const serviceRow = page.locator(".quote-line").filter({ has: page.locator("textarea") }).last();
  const priceInput = serviceRow.locator('input[name$=".unitPrice"]');
  await expect(priceInput).toHaveValue("0,00");
  await expect(page.locator(".summary-total strong")).toContainText("0,00");

  await priceInput.fill("125,50");
  await expect(page.locator(".summary-total strong")).toContainText("125,50");
});
