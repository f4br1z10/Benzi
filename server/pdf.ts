import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/server/prisma";
import { ensureStorageDirectories, sanitizeFilename, storageRoot, workspaceRoot } from "@/lib/files";
import { customerDisplayName, formatCurrency, formatDate } from "@/lib/format";
import { calculateSignificantGoodsVat, incentiveNet } from "@/lib/calculations";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
const multiline = (value: unknown) => escapeHtml(value).replace(/\r?\n/g, "<br>");

function markdown(value: string) {
  const lines = value.replace(/\r/g, "").split("\n"); let html = ""; let inList = false;
  const inline = (line: string) => escapeHtml(line).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  for (const line of lines) {
    if (line.startsWith("- ")) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inline(line.slice(2))}</li>`; continue; }
    if (inList) { html += "</ul>"; inList = false; }
    if (!line.trim()) continue;
    if (line.startsWith("# ")) html += `<h1>${inline(line.slice(2))}</h1>`;
    else if (line.startsWith("## ")) html += `<h2>${inline(line.slice(3))}</h2>`;
    else if (line.startsWith("### ")) html += `<h3>${inline(line.slice(4))}</h3>`;
    else if (/^\d+\. /.test(line)) html += `<p class="numbered">${inline(line)}</p>`;
    else html += `<p>${inline(line)}</p>`;
  }
  if (inList) html += "</ul>";
  return html;
}

async function imageData(pathValue?: string | null) {
  if (!pathValue) return null;
  const absolute = path.isAbsolute(pathValue) ? pathValue : path.resolve(workspaceRoot, pathValue);
  try {
    const bytes = await fs.readFile(absolute);
    const extension = path.extname(absolute).slice(1).toLowerCase();
    const mime = extension === "jpg" || extension === "jpeg" ? "image/jpeg" : extension === "webp" ? "image/webp" : "image/png";
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch { return null; }
}

async function templateData(filename: string) {
  return imageData(path.resolve(process.cwd(), "public", "quote-template", filename));
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function addressLine(address: any) {
  return [address?.address, address?.streetNumber, address?.postalCode, address?.city, address?.province].filter(Boolean).join(" ") || "—";
}

function displayDate(value: unknown) {
  if (!value) return "Da definire";
  const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : String(value));
  return Number.isNaN(date.getTime()) ? escapeHtml(value) : formatDate(date);
}

function paymentRows(quote: any) {
  if (quote.paymentMethod === "Stato di avanzamento lavori") {
    const schedule = parseJson<any[]>(quote.paymentSchedule, []);
    return schedule.map((entry) => `<div><b>${escapeHtml(entry.label)}</b><span>${escapeHtml(entry.percent)}% · ${formatCurrency(Math.round(quote.totalCents * Number(entry.percent || 0) / 100))}</span><small>${displayDate(entry.dueDate)}</small></div>`).join("");
  }
  if (quote.paymentMethod === "Misto") {
    return `<div><b>Acconto</b><span>${escapeHtml(quote.depositPercent)}% · ${formatCurrency(quote.depositCents)}</span></div><div><b>Saldo</b><span>${escapeHtml(quote.balancePercent)}% · ${formatCurrency(quote.balanceCents)}</span></div>`;
  }
  return `<div><b>${escapeHtml(quote.paymentMethod || "Da definire")}</b><span>${multiline(quote.paymentConditions || quote.financingNotes || "")}</span></div>`;
}

type SupplyItem = { item: any; product: any; image: string | null };
function supplyChunks(items: SupplyItem[]) {
  const pages: SupplyItem[][] = []; let current: SupplyItem[] = []; let used = 0;
  for (const item of items) {
    const weight = item.item.type === "PRODOTTO" ? 2 : 1;
    if (current.length && used + weight > 12) { pages.push(current); current = []; used = 0; }
    current.push(item); used += weight;
  }
  if (current.length || !pages.length) pages.push(current);
  return pages;
}

function supplyTable(items: SupplyItem[], showTotal: boolean, totalCents: number) {
  const rows = items.map(({ item, product, image }) => {
    const structural = ["TITOLO", "TESTO"].includes(item.type);
    const title = product?.name || item.title || (structural ? item.description : "Fornitura / servizio");
    const brandModel = [product?.brand, product?.model].filter(Boolean).join(" · ");
    const description = structural ? "" : item.description;
    return `<tr class="${escapeHtml(item.type.toLowerCase())}"><td class="qty">${structural ? "" : escapeHtml(item.quantity)}</td><td class="photo">${image ? `<img src="${image}" alt="">` : ""}</td><td class="description"><strong>${escapeHtml(title)}</strong>${brandModel ? `<small>Marca e modello: ${escapeHtml(brandModel)}</small>` : ""}${description ? `<p>${multiline(description)}</p>` : ""}</td></tr>`;
  }).join("");
  return `<div class="supplies-panel"><table class="supply-table"><thead><tr><th class="qty">Q.TÀ</th><th class="photo">FOTO</th><th>PRODOTTO, MARCA, MODELLO E DESCRIZIONE</th></tr></thead><tbody>${rows}</tbody></table>${showTotal ? `<div class="supply-total"><span>PREZZO TOTALE<br><small>IVA INCLUSA</small></span><b>${formatCurrency(totalCents)}</b></div>` : ""}</div>`;
}

export async function quoteHtml(quoteId: number) {
  const [quote, settings, conditions, privacy, coverBg, customerBg, suppliesBg, summaryBg] = await Promise.all([
    prisma.quote.findUnique({ where: { id: quoteId }, include: { customer: true, category: true, items: { orderBy: { position: "asc" }, include: { product: true } } } }),
    prisma.companySettings.findUnique({ where: { id: 1 } }),
    prisma.legalDocument.findUnique({ where: { type: "CONDIZIONI" } }),
    prisma.legalDocument.findUnique({ where: { type: "PRIVACY" } }),
    templateData("cover-clean.png"), templateData("customer.png"), templateData("supplies.png"), templateData("summary.png"),
  ]);
  if (!quote || !settings) throw new Error("Preventivo o impostazioni aziendali non disponibili.");
  if (!coverBg || !customerBg || !suppliesBg || !summaryBg) throw new Error("Grafiche del template preventivo non disponibili.");

  let customer: any = quote.customer; try { customer = JSON.parse(quote.customerSnapshot); } catch {}
  const addresses = customer.addresses || [];
  const residence = addresses.find((entry: any) => entry.type === "RESIDENZA") || addresses[0] || {};
  const installation = parseJson<any>(quote.installationAddressSnapshot, addresses.find((entry: any) => entry.type === "INSTALLAZIONE") || residence);
  const supplyItems: SupplyItem[] = await Promise.all(quote.items.map(async (item) => {
    const product = parseJson<any>(item.productSnapshot, null);
    return { item, product, image: await imageData(item.product?.imagePath || product?.imagePath) };
  }));
  const vatBreakdown = calculateSignificantGoodsVat(quote.items.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    discountPercent: Number(item.discountPercent),
    vatRate: Number(item.vatRate),
  })));
  const hasAutomaticVat = vatBreakdown.totalCents === quote.totalCents && vatBreakdown.vatCents === quote.vatCents;
  const vatSummary = hasAutomaticVat
    ? `IVA 10% su ${formatCurrency(vatBreakdown.taxableAt10Cents)}: ${formatCurrency(vatBreakdown.vat10Cents)}${vatBreakdown.taxableAt22Cents > 0 ? ` · IVA 22% su ${formatCurrency(vatBreakdown.taxableAt22Cents)}: ${formatCurrency(vatBreakdown.vat22Cents)}` : ""}`
    : `IVA inclusa: ${formatCurrency(quote.vatCents)}`;
  const groups = supplyChunks(supplyItems);
  const calculatedIncentive = incentiveNet(quote.totalCents, Number(quote.incentivePercent), quote.incentiveAmountCents);
  const incentiveAmount = quote.incentiveAmountCents || calculatedIncentive.incentiveAmountCents;
  const netAmount = quote.netAfterIncentiveCents || Math.max(0, quote.totalCents - incentiveAmount);
  const categoryTitle = (quote.category?.name || "Multiprodotto").toUpperCase();

  const cover = `<section class="page template cover"><img class="page-bg" src="${coverBg}" alt=""><div class="cover-title" style="background:transparent"><b>PREVENTIVO</b><strong>${escapeHtml(categoryTitle)}</strong></div></section>`;
  const customerPage = `<section class="page template customer"><img class="page-bg" src="${customerBg}" alt=""><div class="customer-values"><span>${escapeHtml(customer.displayName || customerDisplayName(customer))}</span><span>${escapeHtml(addressLine(residence))}</span><span>${escapeHtml(addressLine(installation))}</span><span>${escapeHtml(customer.taxCode || customer.vatNumber || "—")}</span><span>${escapeHtml(customer.email || "—")}</span><span>${escapeHtml(customer.phone || "—")}</span></div></section>`;
  const supplyPages = groups.map((group, index) => `<section class="page template supplies"><img class="page-bg" src="${suppliesBg}" alt="">${supplyTable(group, index === groups.length - 1, quote.totalCents)}</section>`).join("");
  const notes = [quote.visibleNotes, quote.additionalConditions].filter(Boolean).join("\n");
  const summary = `<section class="page template summary" style="--bg:url('${summaryBg}')"><div class="summary-panel"><div class="summary-total"><div><span>TOTALE OFFERTA <small>IVA INCLUSA</small></span><b>${formatCurrency(quote.totalCents)}</b></div><div class="net"><span>TOTALE DA PAGARE<br><small>AL NETTO DELL’INCENTIVO</small></span><b>${formatCurrency(netAmount)}</b></div><p>${vatSummary}</p><p>Incentivo: ${escapeHtml(quote.incentive || "Nessun incentivo")}${incentiveAmount ? ` · ${formatCurrency(incentiveAmount)}` : ""}</p></div><div class="summary-columns"><div><h3>METODO E CONDIZIONI DI PAGAMENTO</h3><div class="payment-rows">${paymentRows(quote)}</div></div><div><h3>TEMPI DI CONSEGNA IMPIANTO</h3><p>${multiline(quote.deliveryTime || "Da definire")}</p></div></div><div class="summary-meta"><div><b>NUMERO OFFERTA</b><span>${escapeHtml(quote.number)}</span></div><div><b>DATA OFFERTA</b><span>${formatDate(quote.quoteDate)}</span></div><div><b>VALIDITÀ OFFERTA</b><span>${escapeHtml(quote.validityDays)} giorni · fino al ${formatDate(quote.expiryDate)}</span></div><div><b>NOTE IMPORTANTI</b><span>${multiline(notes || "I prezzi indicati sono IVA inclusa.")}</span></div></div><div class="signatures"><div><b>FIRMA DEL CLIENTE</b></div><div><b>FIRMA SG CLIMA S.R.L.</b></div></div></div></section>`;
  const legalStart = groups.length + 4;
  const legalPages = `<section class="page legal"><div class="page-circle">${legalStart}</div><div class="legal-content">${markdown(conditions?.content || "")}</div></section><section class="page legal"><div class="page-circle">${legalStart + 1}</div><div class="legal-content">${markdown(privacy?.content || "")}</div></section>`;

  const css = `
  @page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,"Segoe UI",sans-serif;color:#0a3655;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:210mm;height:297mm;position:relative;page-break-after:always;overflow:hidden;background:#fff}.page:last-child{page-break-after:auto}.template{background-image:var(--bg);background-size:210mm 297mm;background-repeat:no-repeat}.cover-title{position:absolute;z-index:1;left:9.5mm;top:99mm;width:103mm;min-height:37mm;background:linear-gradient(90deg,#fff 82%,rgba(255,255,255,.25));padding:0 0 3mm}.cover-title b{display:block;font-size:15mm;line-height:1;color:#073655;letter-spacing:-.5mm}.cover-title strong{display:block;margin-top:3mm;font-size:8.7mm;line-height:1.12;color:#66a536;max-width:100mm}.customer-values{position:absolute;left:77mm;right:11mm;top:121mm;display:grid;grid-template-rows:repeat(6,20.5mm);font-size:4mm;font-weight:600;color:#173a56;align-items:center}.customer-values span{padding:0 2mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.supplies-panel{position:absolute;left:10mm;right:10mm;top:78.5mm;min-height:170mm;background:#fff;border:1px solid #cad4d9;border-radius:2mm;overflow:hidden}.supply-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:2.75mm;color:#173a56}.supply-table th{height:10mm;background:#073b5c;color:#fff;text-align:left;padding:1.5mm 2mm;font-size:2.65mm}.supply-table th small{font-size:2mm}.supply-table td{border-bottom:1px solid #d4dce0;padding:1.6mm 2mm;vertical-align:middle;height:19mm}.supply-table .qty{width:18mm;text-align:center;font-weight:700}.supply-table .photo{width:35mm;text-align:center}.supply-table .photo img{width:29mm;height:16mm;object-fit:contain}.supply-table .description strong{display:block;font-size:3mm;text-transform:uppercase}.supply-table .description small{display:block;margin-top:.6mm;font-size:2.3mm}.supply-table .description p{margin:.8mm 0 0;line-height:1.25;font-size:2.35mm;max-height:8mm;overflow:hidden}.supply-table .price{width:39mm;text-align:right;color:#5d9632;font-weight:700;font-size:3.4mm;padding-right:4mm}.supply-table tr.titolo td{height:9mm;background:#f1f5f2}.supply-table tr.titolo .description strong{color:#5d9632}.supply-table tr.testo td{height:11mm}.supply-total{height:15mm;display:flex;align-items:center;justify-content:flex-end;gap:14mm;padding:2mm 4mm;background:#f4f6f5;font-size:3.4mm}.supply-total span{font-weight:700}.supply-total small{color:#65a337}.supply-total b{background:#073b5c;color:#fff;padding:2.5mm 5mm;border-radius:1mm;font-size:5.5mm}.summary-panel{position:absolute;left:10mm;right:10mm;top:82mm;height:168mm;background:#fff;color:#173a56}.summary-total{border:1px solid #d5dde0;border-radius:2mm;padding:3mm 6mm}.summary-total>div{display:flex;justify-content:space-between;align-items:center}.summary-total span{font-size:4mm;font-weight:800}.summary-total span small{display:block;color:#65a337}.summary-total b{font-size:7.2mm;background:#69a83a;color:#fff;border-radius:1.5mm;padding:2mm 7mm;min-width:72mm;text-align:right}.summary-total .net{margin-top:2mm;padding-top:2mm;border-top:1px solid #d5dde0}.summary-total .net b{background:#073b5c}.summary-total p{margin:1.5mm 0 0;text-align:right;font-size:2.4mm}.summary-columns{display:grid;grid-template-columns:1fr 1fr;gap:9mm;margin:5mm 3mm}.summary-columns h3,.summary-meta b{font-size:3.2mm;border-bottom:1px solid #a9bd98;padding-bottom:1.5mm;margin:0 0 2mm}.summary-columns p{margin:0;font-size:3mm;line-height:1.35}.payment-rows{font-size:2.6mm}.payment-rows>div{display:grid;grid-template-columns:1fr auto;gap:1mm 3mm;margin:1.2mm 0}.payment-rows small{grid-column:2}.summary-meta{display:grid;grid-template-columns:1fr 1fr;gap:0 10mm;border-top:1px solid #d5dde0}.summary-meta>div{min-height:18mm;padding:3mm}.summary-meta b{display:block;border:0;margin:0}.summary-meta span{font-size:2.8mm;line-height:1.3}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:14mm;margin:3mm 3mm 0}.signatures>div{height:27mm;border:1px dashed #aeb9be;border-radius:2mm;padding:3mm;font-size:3mm}.legal{padding:25mm 22mm 14mm;color:#171717}.page-circle{position:absolute;top:-1mm;left:50%;transform:translateX(-50%);width:17mm;height:17mm;border-radius:50%;background:#456e9b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:9pt;font-weight:bold}.legal-content{font-family:"Arial Narrow",Arial,sans-serif;font-size:7.05pt;line-height:1.28}.legal-content h1{color:#d33333;font-size:12pt;letter-spacing:.3pt;margin:6mm 0 11mm}.legal:last-child .legal-content h1{text-align:center;margin-bottom:5mm}.legal-content h2{font-size:9.6pt;font-weight:normal;margin:6mm 0 3mm}.legal-content h3{text-align:center;font-size:8pt;font-weight:normal;margin:0 0 6mm}.legal-content p{margin:2.4mm 0}.legal-content ul{margin:2mm 0 3mm;padding-left:8mm}.legal-content li{margin:1.6mm 0;padding-left:1mm}.legal-content .numbered{margin-left:6mm}.customer-values{inset:0 11mm 0 77mm;display:block}.customer-values span{position:absolute;left:0;right:0;height:5.2mm;line-height:5.2mm}.customer-values span:nth-child(1){top:124.2mm}.customer-values span:nth-child(2){top:138.4mm}.customer-values span:nth-child(3){top:159.4mm}.customer-values span:nth-child(4){top:185.4mm}.customer-values span:nth-child(5){top:205.6mm}.customer-values span:nth-child(6){top:225.6mm}`;
  return { quote, html: `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>${css}.page-bg{position:absolute;inset:0;width:210mm;height:297mm;object-fit:cover;z-index:0}</style></head><body>${cover}${customerPage}${supplyPages}${summary}${legalPages}</body></html>` };
}

export async function generateQuotePdf(quoteId: number, outputOverride?: string) {
  await ensureStorageDirectories(); const { quote, html } = await quoteHtml(quoteId); const customer = quote.customer;
  const baseName = sanitizeFilename(`Preventivo_${quote.number}_${customerDisplayName(customer)}.pdf`);
  const target = outputOverride || path.join(storageRoot, "generated-quotes", baseName);
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined }); }
  catch { throw new Error("Browser PDF non installato. Esegui prima: npm run setup"); }
  try {
    const page = await browser.newPage(); await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => Promise.all(Array.from(document.images).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.addEventListener("load", () => resolve(), { once: true }); image.addEventListener("error", () => resolve(), { once: true }); }))));
    const primary = await page.pdf({ format: "A4", printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" }, preferCSSPageSize: true });
    let finalBytes = primary;
    if (quote.attachmentMode !== "NESSUNO") {
      const attachments = quote.attachmentMode === "TUTTE"
        ? await prisma.productAttachment.findMany({ where: { product: { quoteItems: { some: { quoteId } } } } })
        : (await prisma.quoteAttachmentSelection.findMany({ where: { quoteId, selected: true }, include: { attachment: true } })).map((entry) => entry.attachment);
      if (attachments.length) {
        const merged = await PDFDocument.load(primary);
        for (const attachment of attachments) { try { const source = await PDFDocument.load(await fs.readFile(attachment.path)); const pages = await merged.copyPages(source, source.getPageIndices()); pages.forEach((pdfPage) => merged.addPage(pdfPage)); } catch {} }
        finalBytes = Buffer.from(await merged.save());
      }
    }
    await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, finalBytes);
    await prisma.quote.update({ where: { id: quoteId }, data: { lastPdfPath: target, lastPdfGeneratedAt: new Date() } });
    return { path: target, filename: path.basename(target), size: finalBytes.length };
  } finally { await browser.close(); }
}
