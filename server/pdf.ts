import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/server/prisma";
import { ensureStorageDirectories, sanitizeFilename, storageRoot, workspaceRoot } from "@/lib/files";
import { customerDisplayName, formatCurrency, formatDate } from "@/lib/format";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]!));
const multiline = (value: unknown) => escapeHtml(value).replace(/\r?\n/g, "<br>");

function markdown(value: string) {
  const lines = value.replace(/\r/g, "").split("\n"); let html = ""; let inList = false;
  const inline = (line: string) => escapeHtml(line).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  for (const line of lines) {
    if (line.startsWith("- ")) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inline(line.slice(2))}</li>`; continue; }
    if (inList) { html += "</ul>"; inList = false; }
    if (!line.trim()) { html += ""; continue; }
    if (line.startsWith("# ")) html += `<h1>${inline(line.slice(2))}</h1>`;
    else if (line.startsWith("## ")) html += `<h2>${inline(line.slice(3))}</h2>`;
    else if (line.startsWith("### ")) html += `<h3>${inline(line.slice(4))}</h3>`;
    else if (/^\d+\. /.test(line)) html += `<p class="numbered">${inline(line)}</p>`;
    else html += `<p>${inline(line)}</p>`;
  }
  if (inList) html += "</ul>"; return html;
}

function chunks(items: any[]) {
  const result: any[][] = []; let current: any[] = []; let used = 0; let capacity = 20;
  for (const item of items) {
    const weight = Math.max(2, String(item.description || "").split("\n").length + Math.ceil(String(item.description || "").length / 95));
    if (current.length && used + weight > capacity) { result.push(current); current = []; used = 0; capacity = 34; }
    current.push(item); used += weight;
  }
  if (current.length || !result.length) result.push(current); return result;
}

async function logoData(pathValue?: string | null) {
  if (!pathValue) return null; const absolute = path.isAbsolute(pathValue) ? pathValue : path.resolve(workspaceRoot, pathValue);
  try { const bytes = await fs.readFile(absolute); const ext = path.extname(absolute).slice(1).toLowerCase(); return `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${bytes.toString("base64")}`; } catch { return null; }
}

function pageCircle(page: number) { return `<div class="page-circle">${page}</div>`; }
function economicTable(items: any[]) { return `<table class="items"><thead><tr><th class="qty">Quantità</th><th>Opere preventivate</th><th class="price">Prezzo IVA inclusa</th></tr></thead><tbody>${items.map((item) => `<tr class="${item.type.toLowerCase()}"><td class="qty">${["TITOLO","TESTO"].includes(item.type) ? "" : escapeHtml(item.quantity)}</td><td class="description">${item.type === "TITOLO" ? `<strong>${multiline(item.description)}</strong>` : multiline(item.description)}</td><td class="price">${["TITOLO","TESTO"].includes(item.type) ? "" : formatCurrency(item.totalCents)}</td></tr>`).join("")}</tbody></table>`; }

export async function quoteHtml(quoteId: number) {
  const [quote, settings, conditions, privacy] = await Promise.all([
    prisma.quote.findUnique({ where: { id: quoteId }, include: { customer: true, category: true, items: { orderBy: { position: "asc" } } } }),
    prisma.companySettings.findUnique({ where: { id: 1 } }), prisma.legalDocument.findUnique({ where: { type: "CONDIZIONI" } }), prisma.legalDocument.findUnique({ where: { type: "PRIVACY" } })
  ]);
  if (!quote || !settings) throw new Error("Preventivo o impostazioni aziendali non disponibili.");
  let customer: any = quote.customer; try { customer = JSON.parse(quote.customerSnapshot); } catch {}
  let address: any = {}; try { address = quote.installationAddressSnapshot ? JSON.parse(quote.installationAddressSnapshot) : customer.addresses?.find((a:any)=>a.type === "INSTALLAZIONE") || customer.addresses?.[0] || {}; } catch {}
  const logo = await logoData(settings.logoPath); const groups = chunks(quote.items); const totalPages = groups.length + 2;
  const companyBlock = `<div class="company"><strong>${escapeHtml(settings.businessName)}</strong><br>${settings.vatNumber ? `P. IVA ${escapeHtml(settings.vatNumber)}<br>` : ""}${settings.email ? `${escapeHtml(settings.email)}<br>` : ""}${settings.phone ? `TEL: ${escapeHtml(settings.phone)}<br>` : ""}<span>Indirizzo:</span><br>${escapeHtml([settings.address, settings.streetNumber, settings.city].filter(Boolean).join(" "))}<br>${settings.openingHours ? `<span>Orari di apertura:</span><br>${multiline(settings.openingHours)}` : ""}</div>`;
  const first = `<section class="page economic first">${pageCircle(1)}<header>${companyBlock}<div class="logo">${logo ? `<img src="${logo}" alt="Logo">` : `<strong>SG Clima S.r.l.</strong>`}</div></header><div class="date-block"><b>Data:</b> ${formatDate(quote.quoteDate)}<br><b>Validità Preventivo:</b> ${quote.validityDays} giorni</div><table class="blue info"><thead><tr><th>Venditore</th><th>Cliente</th><th>Indirizzo</th><th>Comune</th></tr></thead><tbody><tr><td>${escapeHtml(quote.seller || "-")}</td><td>${escapeHtml(customer.displayName || customerDisplayName(customer))}</td><td>${escapeHtml([address.address, address.streetNumber].filter(Boolean).join(" ") || "-")}</td><td>${escapeHtml(address.city || "-")}</td></tr></tbody></table><table class="blue info second"><thead><tr><th>Prodotto</th><th>Metodo di pagamento</th><th>Condizioni di pagamento</th><th>Tempi di consegna</th></tr></thead><tbody><tr><td>${escapeHtml(quote.category?.name || "Altro")}</td><td>${escapeHtml(quote.paymentMethod || "-")}</td><td>${multiline(quote.paymentConditions || "-")}</td><td>${escapeHtml(quote.deliveryTime || "-")}</td></tr></tbody></table>${economicTable(groups[0])}<div class="totals"><div><b>Prezzo totale</b><b>${formatCurrency(quote.totalCents)}</b></div><div><span><b>Totale da pagare</b><small>IVA inclusa</small></span><b>${formatCurrency(quote.totalCents)}</b></div><div><b>Incentivo richiesto</b><b>${escapeHtml(quote.incentive || "Nessuno")}</b></div></div><p class="fiscal">${multiline(quote.fiscalNote || "")}</p><div class="notes"><b>Note</b><span>${multiline(quote.visibleNotes || "")}</span></div><div class="signature">Firma per accettazione ___________________________________</div></section>`;
  const continuation = groups.slice(1).map((group, index) => `<section class="page economic continuation">${pageCircle(index + 2)}<div class="continuation-head"><strong>${escapeHtml(settings.businessName)}</strong><span>${escapeHtml(quote.number)}</span></div><h1>Opere preventivate - continuazione</h1>${economicTable(group)}${index === groups.length - 2 ? `<div class="totals compact"><div><b>Totale da pagare IVA inclusa</b><b>${formatCurrency(quote.totalCents)}</b></div></div>` : ""}</section>`).join("");
  const legalStart = groups.length + 1;
  const legalPages = `<section class="page legal">${pageCircle(legalStart)}<div class="legal-content">${markdown(conditions?.content || "")}</div></section><section class="page legal">${pageCircle(totalPages)}<div class="legal-content">${markdown(privacy?.content || "")}</div></section>`;
  return { quote, html: `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>
  @page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,"Segoe UI",sans-serif;color:#171717;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:210mm;height:297mm;padding:16mm 20mm 13mm;position:relative;page-break-after:always;overflow:hidden;background:#fff}.page:last-child{page-break-after:auto}.page-circle{position:absolute;top:-1mm;left:50%;transform:translateX(-50%);width:17mm;height:17mm;border-radius:50%;background:#456e9b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:9pt;font-weight:bold}.economic header{display:flex;justify-content:space-between;align-items:center;margin-top:15mm;height:30mm}.company{font-size:7.3pt;line-height:1.35;max-width:76mm}.company strong{font-size:8pt}.company span{font-weight:bold;text-decoration:underline}.logo{width:78mm;text-align:center;color:#111;font-size:19pt;font-style:italic}.logo img{max-width:74mm;max-height:26mm;object-fit:contain}.date-block{text-align:right;font-size:8pt;line-height:2;margin:3mm 1mm 4mm}table{border-collapse:collapse;width:100%}.info{font-size:7.5pt;margin-bottom:4mm;border:1.3pt solid #54a9d0}.info th,.info td{border:.7pt solid #54a9d0;text-align:left;padding:1.6mm 2mm;vertical-align:top}.info th{font-weight:bold}.info th:nth-child(1){width:18%}.info th:nth-child(2){width:26%}.info th:nth-child(3){width:38%}.info th:nth-child(4){width:18%}.second th:nth-child(1){width:19%}.second th:nth-child(2){width:31%}.second th:nth-child(3){width:28%}.second th:nth-child(4){width:22%}.items{font-size:7.2pt}.items th,.items td{border:.7pt solid #333;padding:2mm;vertical-align:top}.items th{text-align:left;font-weight:bold}.items .qty{width:15mm;text-align:center}.items .price{width:35mm;text-align:right;white-space:nowrap}.items th.price{text-align:center}.items .description{white-space:normal;line-height:1.36}.items tr.titolo td{background:#f1f5f7;font-size:8pt}.items tr.testo td{font-style:italic}.totals{width:67mm;margin-left:auto;font-size:7.5pt}.totals>div{min-height:9mm;border:.7pt solid #333;border-top:0;display:flex;justify-content:space-between;gap:4mm;padding:2mm;align-items:flex-start}.totals small{display:block;font-weight:normal;margin-top:1mm}.fiscal{font-size:6.8pt;margin:15mm 2mm 5mm}.notes{border:.7pt solid #333;display:grid;grid-template-columns:13mm 1fr;font-size:7.2pt;min-height:17mm}.notes>*{padding:2mm}.notes b{border-right:.7pt solid #333}.signature{font-size:11pt;margin-top:36mm}.continuation{padding-top:25mm}.continuation-head{display:flex;justify-content:space-between;border-bottom:1.5pt solid #54a9d0;padding-bottom:3mm;margin-bottom:6mm;color:#315b7e}.continuation h1{text-align:center;font-size:13pt;color:#315b7e;margin:0 0 8mm}.compact{margin-top:0}.legal{padding:25mm 22mm 14mm}.legal-content{font-family:"Arial Narrow",Arial,sans-serif;font-size:7.05pt;line-height:1.28}.legal-content h1{color:#d33333;text-align:left;font-size:12pt;letter-spacing:.3pt;margin:6mm 0 11mm}.legal:last-child .legal-content h1{text-align:center;margin-bottom:5mm}.legal-content h2{font-size:9.6pt;font-weight:normal;margin:6mm 0 3mm}.legal-content h3{text-align:center;font-size:8pt;font-weight:normal;margin:0 0 6mm}.legal-content p{margin:2.4mm 0}.legal-content ul{margin:2mm 0 3mm;padding-left:8mm}.legal-content li{margin:1.6mm 0;padding-left:1mm}.legal-content .numbered{margin-left:6mm}.legal-content strong{font-weight:700}
  </style></head><body>${first}${continuation}${legalPages}</body></html>` };
}

export async function generateQuotePdf(quoteId: number, outputOverride?: string) {
  await ensureStorageDirectories(); const { quote, html } = await quoteHtml(quoteId); const customer = quote.customer;
  const baseName = sanitizeFilename(`Preventivo_${quote.number}_${customerDisplayName(customer)}.pdf`);
  const target = outputOverride || path.join(storageRoot, "generated-quotes", baseName);
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined
    });
  }
  catch { throw new Error("Browser PDF non installato. Esegui prima: npm run setup"); }
  try {
    const page = await browser.newPage(); await page.setContent(html, { waitUntil: "load" });
    const primary = await page.pdf({ format: "A4", printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" }, preferCSSPageSize: true });
    let finalBytes = primary;
    if (quote.attachmentMode !== "NESSUNO") {
      const attachments = quote.attachmentMode === "TUTTE"
        ? await prisma.productAttachment.findMany({ where: { product: { quoteItems: { some: { quoteId } } } } })
        : (await prisma.quoteAttachmentSelection.findMany({ where: { quoteId, selected: true }, include: { attachment: true } })).map((x) => x.attachment);
      if (attachments.length) {
        const merged = await PDFDocument.load(primary);
        for (const attachment of attachments) { try { const source = await PDFDocument.load(await fs.readFile(attachment.path)); const pages = await merged.copyPages(source, source.getPageIndices()); pages.forEach((p) => merged.addPage(p)); } catch {} }
        finalBytes = Buffer.from(await merged.save());
      }
    }
    await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, finalBytes);
    await prisma.quote.update({ where: { id: quoteId }, data: { lastPdfPath: target, lastPdfGeneratedAt: new Date() } });
    return { path: target, filename: path.basename(target), size: finalBytes.length };
  } finally { await browser.close(); }
}
