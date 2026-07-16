# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-full-application.spec.ts >> campagna QA completa SG Clima >> creazione, modifica, ricerca, controllo duplicato ed eliminazione clienti
- Location: tests\e2e\qa-full-application.spec.ts:39:7

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: locator.click: Test timeout of 180000ms exceeded.
Call log:
  - waiting for locator('.modal').getByRole('button', { name: 'Salva cliente' })
    - locator resolved to <button class="btn btn-primary">Salva cliente</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div role="status" class="toast ">Cliente salvato correttamente</div> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div role="status" class="toast ">Cliente salvato correttamente</div> intercepts pointer events
    - retrying click action
      - waiting 100ms
    329 × waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <div role="status" class="toast ">Cliente salvato correttamente</div> intercepts pointer events
      - retrying click action
        - waiting 500ms

```

# Test source

```ts
  1   | import { test, expect, type APIRequestContext } from "@playwright/test";
  2   | 
  3   | test.describe.serial("campagna QA completa SG Clima", () => {
  4   |   const stamp = Date.now();
  5   |   const prefix = `QA-${stamp}`;
  6   |   const customerName = `${prefix} Cliente`;
  7   |   const productCode = `${prefix}-PROD`;
  8   |   const productName = `${prefix} Climatizzatore test`;
  9   |   const serviceName = `${prefix} Installazione test`;
  10  |   const quoteSubject = `${prefix} Preventivo filtri`;
  11  |   let customerId = 0;
  12  |   let disposableCustomerId = 0;
  13  |   let productId = 0;
  14  |   let serviceId = 0;
  15  |   let quoteId = 0;
  16  |   let duplicateQuoteId = 0;
  17  | 
  18  |   async function findRecord(request: APIRequestContext, url: string, predicate: (record: any) => boolean) {
  19  |     const response = await request.get(url);
  20  |     expect(response.ok()).toBeTruthy();
  21  |     return (await response.json()).find(predicate);
  22  |   }
  23  | 
  24  |   test("navigazione principale e tutorial", async ({ page }) => {
  25  |     const routes = ["/", "/preventivi", "/clienti", "/prodotti", "/servizi", "/scadenze", "/tutorial", "/impostazioni", "/backup"];
  26  |     for (const route of routes) {
  27  |       const response = await page.goto(route);
  28  |       expect(response?.status(), `route ${route}`).toBe(200);
  29  |       await expect(page.locator(".topbar-title")).toContainText("SG Clima");
  30  |       await expect(page.locator("body")).not.toContainText("Application error");
  31  |     }
  32  |     await page.goto("/tutorial");
  33  |     await expect(page.getByRole("heading", { name: "Come funziona l’applicazione" })).toBeVisible();
  34  |     await page.getByRole("button", { name: /Creare un preventivo/ }).click();
  35  |     await expect(page.getByRole("heading", { name: "Creare un preventivo" })).toBeVisible();
  36  |     await expect(page.getByText("La procedura guidata in sei passaggi")).toBeVisible();
  37  |   });
  38  | 
  39  |   test("creazione, modifica, ricerca, controllo duplicato ed eliminazione clienti", async ({ page, request }) => {
  40  |     await page.goto("/clienti");
  41  |     await page.getByRole("button", { name: "+ Crea cliente" }).click();
  42  |     let modal = page.locator(".modal");
  43  |     await modal.locator('[name="firstName"]').fill(prefix);
  44  |     await modal.locator('[name="lastName"]').fill("Cliente");
  45  |     await modal.locator('[name="taxCode"]').fill(`QATST${String(stamp).slice(-10)}`);
  46  |     await modal.locator('[name="phone"]').fill("0611111111");
  47  |     await modal.locator('[name="email"]').fill(`qa-${stamp}@example.com`);
  48  |     await modal.locator('[name="addresses.0.address"]').fill("Via QA");
  49  |     await modal.locator('[name="addresses.0.streetNumber"]').fill("10");
  50  |     await modal.locator('[name="addresses.0.postalCode"]').fill("00100");
  51  |     await modal.locator('[name="addresses.0.city"]').fill("Roma QA");
  52  |     await modal.getByRole("button", { name: "Copia dalla residenza" }).click();
  53  |     await modal.getByRole("button", { name: "Salva cliente" }).click();
  54  |     await expect(page.getByText("Cliente salvato correttamente")).toBeVisible();
  55  | 
  56  |     const customer = await findRecord(request, `/api/customers?q=${encodeURIComponent(prefix)}`, (record) => record.firstName === prefix);
  57  |     expect(customer).toBeTruthy();
  58  |     customerId = customer.id;
  59  | 
  60  |     const search = page.locator("#customer-search");
  61  |     await search.fill(prefix);
  62  |     const customerRow = page.locator("tbody tr").filter({ hasText: customerName });
  63  |     await expect(customerRow).toHaveCount(1);
  64  |     await customerRow.getByRole("button", { name: "Modifica" }).click();
  65  |     modal = page.locator(".modal");
  66  |     await modal.locator('[name="phone"]').fill("0622222222");
  67  |     await modal.locator('[name="notes"]').fill("Modificato dal controllo qualità");
> 68  |     await modal.getByRole("button", { name: "Salva cliente" }).click();
      |                                                                ^ Error: locator.click: Test timeout of 180000ms exceeded.
  69  |     await expect(page.getByText("Cliente salvato correttamente")).toBeVisible();
  70  |     expect((await (await request.get(`/api/customers/${customerId}`)).json()).phone).toBe("0622222222");
  71  | 
  72  |     await page.getByRole("button", { name: "+ Crea cliente" }).click();
  73  |     modal = page.locator(".modal");
  74  |     await modal.locator('[name="firstName"]').fill(prefix);
  75  |     await modal.locator('[name="lastName"]').fill("Duplicato");
  76  |     await modal.locator('[name="taxCode"]').fill(`QATST${String(stamp).slice(-10)}`);
  77  |     page.once("dialog", (dialog) => dialog.dismiss());
  78  |     await modal.getByRole("button", { name: "Salva cliente" }).click();
  79  |     await expect(page.getByText(/Esiste già un cliente|Duplicato anagrafico/)).toBeVisible();
  80  |     await modal.getByRole("button", { name: "×" }).click();
  81  | 
  82  |     await page.getByRole("button", { name: "+ Crea cliente" }).click();
  83  |     modal = page.locator(".modal");
  84  |     await modal.locator('[name="firstName"]').fill(prefix);
  85  |     await modal.locator('[name="lastName"]').fill("Da eliminare");
  86  |     await modal.getByRole("button", { name: "Salva cliente" }).click();
  87  |     await expect(page.getByText("Cliente salvato correttamente")).toBeVisible();
  88  |     const disposable = await findRecord(request, `/api/customers?q=${encodeURIComponent("Da eliminare")}`, (record) => record.lastName === "Da eliminare");
  89  |     disposableCustomerId = disposable.id;
  90  |     await search.fill("Da eliminare");
  91  |     const disposableRow = page.locator("tbody tr").filter({ hasText: "Da eliminare" });
  92  |     page.once("dialog", (dialog) => dialog.accept());
  93  |     await disposableRow.getByRole("button", { name: "Elimina" }).click();
  94  |     await expect(disposableRow).toHaveCount(0);
  95  |     disposableCustomerId = 0;
  96  |   });
  97  | 
  98  |   test("creazione e modifica prodotto", async ({ page, request }) => {
  99  |     await page.goto("/prodotti");
  100 |     await page.getByRole("button", { name: "+ Inserisci prodotto" }).click();
  101 |     const modal = page.locator(".modal");
  102 |     await modal.locator('[name="internalCode"]').fill(productCode);
  103 |     await modal.locator('[name="name"]').fill(productName);
  104 |     const categoryValue = await modal.locator('[name="categoryId"] option').nth(1).getAttribute("value");
  105 |     await modal.locator('[name="categoryId"]').selectOption(categoryValue!);
  106 |     await modal.locator('[name="brand"]').fill("Marca QA");
  107 |     await modal.locator('[name="model"]').fill("Modello QA");
  108 |     await modal.locator('[name="salePriceInclVat"]').fill("1.220,00");
  109 |     await modal.locator('[name="salePriceExclVat"]').fill("1.000,00");
  110 |     await modal.locator('[name="purchaseCost"]').fill("600,00");
  111 |     await modal.locator('[name="quoteDescription"]').fill(`${productName}\nFornitura e posa di prova`);
  112 |     await modal.getByRole("button", { name: "Salva prodotto" }).click();
  113 |     await expect(page.getByText("Prodotto salvato")).toBeVisible();
  114 | 
  115 |     const product = await findRecord(request, `/api/products?q=${encodeURIComponent(productCode)}`, (record) => record.internalCode === productCode);
  116 |     productId = product.id;
  117 |     expect(product.salePriceInclVatCents).toBe(122000);
  118 | 
  119 |     const search = page.locator("#product-search");
  120 |     await search.fill(productCode);
  121 |     const row = page.locator("tbody tr").filter({ hasText: productCode });
  122 |     await row.getByRole("button", { name: "Modifica" }).click();
  123 |     await page.locator(".modal").locator('[name="power"]').fill("12000 BTU");
  124 |     await page.locator(".modal").getByRole("button", { name: "Salva prodotto" }).click();
  125 |     await expect(page.getByText("Prodotto salvato")).toBeVisible();
  126 |     expect((await (await request.get(`/api/products/${productId}`)).json()).power).toBe("12000 BTU");
  127 |   });
  128 | 
  129 |   test("creazione, ricerca e modifica servizio con prezzo zero", async ({ page, request }) => {
  130 |     await page.goto("/servizi");
  131 |     await page.getByRole("button", { name: "+ Nuovo servizio" }).click();
  132 |     let modal = page.locator(".modal");
  133 |     await modal.locator('[name="name"]').fill(serviceName);
  134 |     await modal.locator('[name="description"]').fill("Servizio creato dal controllo qualità");
  135 |     await modal.locator('[name="price"]').fill("0,00");
  136 |     await modal.locator('[name="unit"]').fill("corpo");
  137 |     await modal.getByRole("button", { name: "Salva servizio" }).click();
  138 |     await expect(page.getByText("Servizio salvato")).toBeVisible();
  139 | 
  140 |     const service = await findRecord(request, `/api/services?q=${encodeURIComponent(prefix)}`, (record) => record.name === serviceName);
  141 |     serviceId = service.id;
  142 |     expect(service.defaultPriceCents).toBe(0);
  143 | 
  144 |     const search = page.locator('input[placeholder*="Installazione"]');
  145 |     await search.fill(prefix);
  146 |     const row = page.locator("tbody tr").filter({ hasText: serviceName });
  147 |     await row.getByRole("button", { name: "Modifica" }).click();
  148 |     modal = page.locator(".modal");
  149 |     await modal.locator('[name="price"]').fill("49,90");
  150 |     await modal.getByRole("button", { name: "Salva servizio" }).click();
  151 |     await expect(page.getByText("Servizio salvato")).toBeVisible();
  152 |     expect((await findRecord(request, `/api/services?q=${encodeURIComponent(prefix)}`, (record) => record.id === serviceId)).defaultPriceCents).toBe(4990);
  153 |   });
  154 | 
  155 |   test("preventivo completo, calcoli live, anteprima e PDF", async ({ page, request }) => {
  156 |     await page.goto("/preventivi/nuovo");
  157 |     const customerSelect = page.locator('select[name="customerId"]');
  158 |     await customerSelect.selectOption(String(customerId));
  159 | 
  160 |     await page.getByRole("button", { name: /2\. Informazioni/ }).click();
  161 |     await page.locator('[name="subject"]').fill(quoteSubject);
  162 |     await page.locator('[name="validityDays"]').fill("2");
  163 |     await page.locator('[name="categoryId"]').selectOption((await request.get(`/api/products/${productId}`).then((response) => response.json())).categoryId.toString());
  164 | 
  165 |     await page.getByRole("button", { name: /3\. Prodotti e servizi/ }).click();
  166 |     const productSelect = page.locator("select").filter({ hasText: "+ Aggiungi prodotto" }).first();
  167 |     await productSelect.selectOption(String(productId));
  168 |     const serviceSelect = page.locator("select").filter({ hasText: "+ Aggiungi servizio" }).first();
```