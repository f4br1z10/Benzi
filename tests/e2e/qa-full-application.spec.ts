import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.serial("campagna QA completa SG Clima", () => {
  const stamp = Date.now();
  const prefix = `QA-${stamp}`;
  const customerName = `${prefix} Cliente`;
  const productCode = `${prefix}-PROD`;
  const productName = `${prefix} Climatizzatore test`;
  const serviceName = `${prefix} Installazione test`;
  const quoteSubject = `${prefix} Preventivo filtri`;
  let customerId = 0;
  let disposableCustomerId = 0;
  let productId = 0;
  let serviceId = 0;
  let quoteId = 0;
  let duplicateQuoteId = 0;

  async function findRecord(request: APIRequestContext, url: string, predicate: (record: any) => boolean) {
    const response = await request.get(url);
    expect(response.ok()).toBeTruthy();
    return (await response.json()).find(predicate);
  }

  test("navigazione principale e tutorial", async ({ page }) => {
    const routes = ["/", "/preventivi", "/clienti", "/prodotti", "/servizi", "/scadenze", "/tutorial", "/impostazioni", "/backup"];
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), `route ${route}`).toBe(200);
      await expect(page.locator(".topbar-title")).toContainText("SG Clima");
      await expect(page.locator("body")).not.toContainText("Application error");
    }
    await page.goto("/tutorial");
    await expect(page.getByRole("heading", { name: "Come funziona l’applicazione" })).toBeVisible();
    await page.getByRole("button", { name: /Creare un preventivo/ }).click();
    await expect(page.getByRole("heading", { name: "Creare un preventivo" })).toBeVisible();
    await expect(page.getByText("La procedura guidata in sei passaggi")).toBeVisible();
  });

  test("creazione, modifica, ricerca, controllo duplicato ed eliminazione clienti", async ({ page, request }) => {
    await page.goto("/clienti");
    await page.getByRole("button", { name: "+ Crea cliente" }).click();
    let modal = page.locator(".modal");
    await modal.locator('[name="firstName"]').fill(prefix);
    await modal.locator('[name="lastName"]').fill("Cliente");
    await modal.locator('[name="taxCode"]').fill(`QATST${String(stamp).slice(-10)}`);
    await modal.locator('[name="phone"]').fill("0611111111");
    await modal.locator('[name="email"]').fill(`qa-${stamp}@example.com`);
    await modal.locator('[name="addresses.0.address"]').fill("Via QA");
    await modal.locator('[name="addresses.0.streetNumber"]').fill("10");
    await modal.locator('[name="addresses.0.postalCode"]').fill("00100");
    await modal.locator('[name="addresses.0.city"]').fill("Roma QA");
    await modal.getByRole("button", { name: "Copia dalla residenza" }).click();
    await modal.getByRole("button", { name: "Salva cliente" }).click();
    await expect(page.getByText("Cliente salvato correttamente")).toBeVisible();

    const customer = await findRecord(request, `/api/customers?q=${encodeURIComponent(prefix)}`, (record) => record.firstName === prefix);
    expect(customer).toBeTruthy();
    customerId = customer.id;

    const search = page.locator("#customer-search");
    await search.fill(prefix);
    const customerRow = page.locator("tbody tr").filter({ hasText: customerName });
    await expect(customerRow).toHaveCount(1);
    await customerRow.getByRole("button", { name: "Modifica" }).click();
    modal = page.locator(".modal");
    await modal.locator('[name="phone"]').fill("0622222222");
    await modal.locator('[name="notes"]').fill("Modificato dal controllo qualità");
    await modal.getByRole("button", { name: "Salva cliente" }).click();
    await expect(page.getByText("Cliente salvato correttamente")).toBeVisible();
    expect((await (await request.get(`/api/customers/${customerId}`)).json()).phone).toBe("0622222222");

    await page.getByRole("button", { name: "+ Crea cliente" }).click();
    modal = page.locator(".modal");
    await modal.locator('[name="firstName"]').fill(prefix);
    await modal.locator('[name="lastName"]').fill("Duplicato");
    await modal.locator('[name="taxCode"]').fill(`QATST${String(stamp).slice(-10)}`);
    page.once("dialog", (dialog) => dialog.dismiss());
    await modal.getByRole("button", { name: "Salva cliente" }).click();
    await expect(page.getByText(/Esiste già un cliente|Duplicato anagrafico/)).toBeVisible();
    await modal.getByRole("button", { name: "×" }).click();

    await page.getByRole("button", { name: "+ Crea cliente" }).click();
    modal = page.locator(".modal");
    await modal.locator('[name="firstName"]').fill(prefix);
    await modal.locator('[name="lastName"]').fill("Da eliminare");
    await modal.getByRole("button", { name: "Salva cliente" }).click();
    await expect(page.getByText("Cliente salvato correttamente")).toBeVisible();
    const disposable = await findRecord(request, `/api/customers?q=${encodeURIComponent("Da eliminare")}`, (record) => record.lastName === "Da eliminare");
    disposableCustomerId = disposable.id;
    await search.fill("Da eliminare");
    const disposableRow = page.locator("tbody tr").filter({ hasText: "Da eliminare" });
    page.once("dialog", (dialog) => dialog.accept());
    await disposableRow.getByRole("button", { name: "Elimina" }).click();
    await expect(disposableRow).toHaveCount(0);
    disposableCustomerId = 0;
  });

  test("creazione e modifica prodotto", async ({ page, request }) => {
    await page.goto("/prodotti");
    await page.getByRole("button", { name: "+ Inserisci prodotto" }).click();
    const modal = page.locator(".modal");
    await modal.locator('[name="internalCode"]').fill(productCode);
    await modal.locator('[name="name"]').fill(productName);
    const categoryValue = await modal.locator('[name="categoryId"] option').nth(1).getAttribute("value");
    await modal.locator('[name="categoryId"]').selectOption(categoryValue!);
    await modal.locator('[name="brand"]').fill("Marca QA");
    await modal.locator('[name="model"]').fill("Modello QA");
    await modal.locator('[name="salePriceInclVat"]').fill("1.220,00");
    await modal.locator('[name="salePriceExclVat"]').fill("1.000,00");
    await modal.locator('[name="purchaseCost"]').fill("600,00");
    await modal.locator('[name="quoteDescription"]').fill(`${productName}\nFornitura e posa di prova`);
    await modal.getByRole("button", { name: "Salva prodotto" }).click();
    await expect(page.getByText("Prodotto salvato")).toBeVisible();

    const product = await findRecord(request, `/api/products?q=${encodeURIComponent(productCode)}`, (record) => record.internalCode === productCode);
    productId = product.id;
    expect(product.salePriceInclVatCents).toBe(122000);

    const search = page.locator("#product-search");
    await search.fill(productCode);
    const row = page.locator("tbody tr").filter({ hasText: productCode });
    await row.getByRole("button", { name: "Modifica" }).click();
    await page.locator(".modal").locator('[name="power"]').fill("12000 BTU");
    await page.locator(".modal").getByRole("button", { name: "Salva prodotto" }).click();
    await expect(page.getByText("Prodotto salvato")).toBeVisible();
    expect((await (await request.get(`/api/products/${productId}`)).json()).power).toBe("12000 BTU");
  });

  test("creazione, ricerca e modifica servizio con prezzo zero", async ({ page, request }) => {
    await page.goto("/servizi");
    await page.getByRole("button", { name: "+ Nuovo servizio" }).click();
    let modal = page.locator(".modal");
    await modal.locator('[name="name"]').fill(serviceName);
    await modal.locator('[name="description"]').fill("Servizio creato dal controllo qualità");
    await modal.locator('[name="price"]').fill("0,00");
    await modal.locator('[name="unit"]').fill("corpo");
    await modal.getByRole("button", { name: "Salva servizio" }).click();
    await expect(page.getByText("Servizio salvato")).toBeVisible();

    const service = await findRecord(request, `/api/services?q=${encodeURIComponent(prefix)}`, (record) => record.name === serviceName);
    serviceId = service.id;
    expect(service.defaultPriceCents).toBe(0);

    const search = page.locator('input[placeholder*="Installazione"]');
    await search.fill(prefix);
    const row = page.locator("tbody tr").filter({ hasText: serviceName });
    await row.getByRole("button", { name: "Modifica" }).click();
    modal = page.locator(".modal");
    await modal.locator('[name="price"]').fill("49,90");
    await modal.getByRole("button", { name: "Salva servizio" }).click();
    await expect(page.getByText("Servizio salvato")).toBeVisible();
    expect((await findRecord(request, `/api/services?q=${encodeURIComponent(prefix)}`, (record) => record.id === serviceId)).defaultPriceCents).toBe(4990);
  });

  test("preventivo completo, calcoli live, anteprima e PDF", async ({ page, request }) => {
    await page.goto("/preventivi/nuovo");
    const customerSelect = page.locator('select[name="customerId"]');
    await customerSelect.selectOption(String(customerId));

    await page.getByRole("button", { name: /2\. Informazioni/ }).click();
    await page.locator('[name="subject"]').fill(quoteSubject);
    await page.locator('[name="validityDays"]').fill("2");
    await page.locator('[name="categoryId"]').selectOption((await request.get(`/api/products/${productId}`).then((response) => response.json())).categoryId.toString());

    await page.getByRole("button", { name: /3\. Prodotti e servizi/ }).click();
    const productSelect = page.locator("select").filter({ hasText: "+ Aggiungi prodotto" }).first();
    await productSelect.selectOption(String(productId));
    const serviceSelect = page.locator("select").filter({ hasText: "+ Aggiungi servizio" }).first();
    await serviceSelect.selectOption(String(serviceId));

    const rows = page.locator(".quote-line").filter({ has: page.locator("textarea") });
    await expect(rows).toHaveCount(3);
    await rows.nth(0).locator("textarea").fill(`${prefix} Riga libera`);
    await rows.nth(0).locator('input[name$=".unitPrice"]').fill("100,00");
    await rows.nth(2).locator('input[name$=".unitPrice"]').fill("125,50");
    await expect(page.locator(".summary-total strong")).toContainText("1.445,50");

    await page.getByRole("button", { name: /4\. Pagamento/ }).click();
    await page.locator('[name="depositPercent"]').fill("40");
    await expect(page.getByLabel("Importo acconto")).toHaveValue(/578,20/);

    await page.getByRole("button", { name: /5\. Incentivi e note/ }).click();
    await page.locator('[name="incentive"]').selectOption({ label: "Detrazione 50%" });
    await page.locator('[name="visibleNotes"]').fill(`${prefix} Note visibili`);
    await page.getByRole("button", { name: /6\. Anteprima/ }).click();
    await expect(page.getByText(quoteSubject)).toBeVisible();
    await page.getByRole("button", { name: "Salva ed emetti" }).click();
    await page.waitForURL(/\/preventivi\/\d+$/);
    quoteId = Number(page.url().split("/").pop());
    expect(quoteId).toBeGreaterThan(0);
    await expect(page.getByText("1.445,50")).toBeVisible();

    const pdfResponse = page.waitForResponse((response) => response.url().endsWith(`/api/quotes/${quoteId}/pdf`) && response.request().method() === "POST");
    await page.getByRole("button", { name: "Genera PDF" }).click();
    expect((await pdfResponse).ok()).toBeTruthy();
    const pdf = await request.get(`/api/quotes/${quoteId}/pdf`);
    expect(pdf.ok()).toBeTruthy();
    expect((await pdf.body()).length).toBeGreaterThan(10_000);
  });

  test("filtri preventivi per testo, comune, categoria e stato", async ({ page, request }) => {
    const quote = await (await request.get(`/api/quotes/${quoteId}`)).json();
    await page.goto("/preventivi");
    const form = page.locator("form.filter-card");
    await form.locator('[name="q"]').fill(prefix);
    await form.getByRole("button", { name: "Filtra" }).click();
    await expect(page.locator("tbody tr").filter({ hasText: quote.number })).toHaveCount(1);

    await page.goto(`/preventivi?city=${encodeURIComponent("Roma QA")}`);
    await expect(page.locator("tbody tr").filter({ hasText: quote.number })).toHaveCount(1);
    await page.goto(`/preventivi?categoryId=${quote.categoryId}`);
    await expect(page.locator("tbody tr").filter({ hasText: quote.number })).toHaveCount(1);
    await page.goto("/preventivi?status=EMESSO");
    await expect(page.locator("tbody tr").filter({ hasText: quote.number })).toHaveCount(1);

    await page.goto(`/?q=${encodeURIComponent(prefix)}`);
    await expect(page.locator("tbody tr").filter({ hasText: quote.number })).toHaveCount(1);
  });

  test("scadenza, cronologia, cambio stato e duplicazione", async ({ page, request }) => {
    await page.goto("/scadenze");
    const quote = await (await request.get(`/api/quotes/${quoteId}`)).json();
    const reminderRow = page.locator("tbody tr").filter({ hasText: quote.number });
    await expect(reminderRow).toHaveCount(1);
    page.once("dialog", (dialog) => dialog.accept(`${prefix} Cliente ricontattato`));
    await reminderRow.getByRole("button", { name: "Segna ricontattato" }).click();
    await expect(reminderRow).toHaveCount(0);

    await page.goto(`/preventivi/${quoteId}`);
    await page.getByRole("button", { name: "Segna inviato" }).click();
    await expect(page.locator(".badge-inviato")).toBeVisible();
    await page.getByRole("button", { name: "Accetta" }).click();
    await expect(page.locator(".badge-accettato")).toBeVisible();
    await expect(page.locator(".status-timeline")).toContainText("ACCETTATO");

    await page.getByRole("button", { name: "Duplica" }).click();
    await page.waitForURL(/\/preventivi\/\d+\/modifica$/);
    duplicateQuoteId = Number(page.url().split("/").at(-2));
    expect(duplicateQuoteId).toBeGreaterThan(0);
    expect((await (await request.get(`/api/quotes/${duplicateQuoteId}`)).json()).status).toBe("BOZZA");
  });

  test("impostazioni, backup ed esportazioni CSV", async ({ page, request }) => {
    await page.goto("/impostazioni");
    await expect(page.locator('[name="businessName"]')).toHaveValue(/SG Clima/);
    await page.getByRole("button", { name: "Categorie" }).click();
    await expect(page.getByText("Climatizzatore", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Testi legali" }).click();
    await expect(page.locator('[name="conditionsContent"]')).toHaveValue(/NOTE TECNICHE/);
    await expect(page.locator('[name="privacyContent"]')).toHaveValue(/INFORMATIVA PRIVACY/);

    const backup = await request.get("/api/backup");
    expect(backup.ok()).toBeTruthy();
    expect(backup.headers()["content-type"]).toContain("application/zip");
    expect((await backup.body()).length).toBeGreaterThan(1_000);
    for (const entity of ["customers", "products", "quotes"]) {
      const csv = await request.get(`/api/export/${entity}`);
      expect(csv.ok(), entity).toBeTruthy();
      expect(csv.headers()["content-type"]).toContain("text/csv");
      expect((await csv.text()).length).toBeGreaterThan(20);
    }
  });

  test.afterAll(async ({ request }) => {
    if (duplicateQuoteId) await request.delete(`/api/quotes/${duplicateQuoteId}`).catch(() => undefined);
    if (quoteId) await request.delete(`/api/quotes/${quoteId}`).catch(() => undefined);
    if (productId) await request.delete(`/api/products/${productId}`).catch(() => undefined);
    if (serviceId) await request.delete(`/api/services/${serviceId}`).catch(() => undefined);
    if (customerId) await request.delete(`/api/customers/${customerId}`).catch(() => undefined);
    if (disposableCustomerId) await request.delete(`/api/customers/${disposableCustomerId}`).catch(() => undefined);
  });
});
