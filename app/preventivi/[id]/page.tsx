import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/server/prisma";
import { customerDisplayName, formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import QuoteActions from "@/components/QuoteActions";
import { calculateSignificantGoodsVat } from "@/lib/calculations";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id: Number(id) },
    include: {
      customer: true,
      category: true,
      items: { orderBy: { position: "asc" }, include: { product: true } },
      statusHistory: { orderBy: { changedAt: "desc" } },
    },
  });
  if (!quote) notFound();
  let snapshot: any = {};
  let paymentSchedule: any[] = [];
  try { snapshot = JSON.parse(quote.customerSnapshot); } catch {}
  try { paymentSchedule = quote.paymentSchedule ? JSON.parse(quote.paymentSchedule) : []; } catch {}
  const vatBreakdown = calculateSignificantGoodsVat(quote.items.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    discountPercent: Number(item.discountPercent),
    vatRate: Number(item.vatRate),
  })));
  const hasAutomaticVat = vatBreakdown.totalCents === quote.totalCents && vatBreakdown.vatCents === quote.vatCents;
  return <>
    <div className="page-header"><div><div className="actions"><h1 style={{ marginRight: 10 }}>{quote.number}</h1><StatusBadge status={quote.status} /></div><p>{quote.subject || "Preventivo"} · {customerDisplayName(quote.customer)}</p></div><div className="header-actions"><Link href={`/preventivi/${quote.id}/modifica`} className="btn btn-secondary">Modifica</Link><QuoteActions id={quote.id} number={quote.number} status={quote.status} hasPdf={!!quote.lastPdfPath} /></div></div>
    <div className="dashboard-columns"><div className="stack">
      <section className="card"><div className="card-header"><h2>Dati preventivo</h2></div><div className="card-body"><div className="form-grid form-grid-3"><div><div className="kpi-label">Cliente</div><strong>{snapshot.displayName || customerDisplayName(quote.customer)}</strong></div><div><div className="kpi-label">Categoria</div><strong>{quote.category?.name || "Multiprodotto"}</strong></div><div><div className="kpi-label">Venditore</div><strong>{quote.seller || "—"}</strong></div><div><div className="kpi-label">Data</div><strong>{formatDate(quote.quoteDate)}</strong></div><div><div className="kpi-label">Validità</div><strong>{quote.validityDays} giorni</strong></div><div><div className="kpi-label">Scadenza</div><strong>{formatDate(quote.expiryDate)}</strong></div></div></div></section>
      <section className="card"><div className="card-header"><h2>Prodotti e servizi</h2></div><div className="table-wrap"><table className="table"><thead><tr><th>Q.tà</th><th>Foto</th><th>Prodotto e descrizione</th><th>Imponibile unitario</th><th>IVA</th><th>Totale</th></tr></thead><tbody>{quote.items.map((item) => { const structural = ["TITOLO", "TESTO"].includes(item.type); return <tr key={item.id}><td>{structural ? "" : String(item.quantity)}</td><td>{item.product?.imagePath && <img src={`/api/products/${item.product.id}/image`} alt="" style={{ width: 64, height: 54, objectFit: "contain" }} />}</td><td style={{ whiteSpace: "pre-line" }}>{(item.product?.name || item.title) && <strong style={{ display: "block" }}>{item.product?.name || item.title}</strong>}{item.product && [item.product.brand, item.product.model].filter(Boolean).length > 0 && <small style={{ display: "block" }}>Marca e modello: {[item.product.brand, item.product.model].filter(Boolean).join(" · ")}</small>}{item.description}</td><td>{structural ? "" : formatCurrency(item.unitPriceCents)}</td><td>{structural ? "" : hasAutomaticVat ? "Automatica" : `${String(item.vatRate)}%`}</td><td><strong>{item.totalCents ? formatCurrency(item.totalCents) : ""}</strong></td></tr>; })}</tbody></table></div><div className="card-body" style={{ maxWidth: 460, marginLeft: "auto" }}><div className="summary-row"><span>Imponibile</span><strong>{formatCurrency(quote.subtotalCents)}</strong></div>{hasAutomaticVat ? <><div className="summary-row"><span>IVA 10% su {formatCurrency(vatBreakdown.taxableAt10Cents)}</span><strong>{formatCurrency(vatBreakdown.vat10Cents)}</strong></div>{vatBreakdown.taxableAt22Cents > 0 && <div className="summary-row"><span>IVA 22% su {formatCurrency(vatBreakdown.taxableAt22Cents)}</span><strong>{formatCurrency(vatBreakdown.vat22Cents)}</strong></div>}</> : <><div className="summary-row"><span>IVA</span><strong>{formatCurrency(quote.vatCents)}</strong></div><p className="help-text">Preventivo precedente: modifica e salva per applicare il nuovo calcolo IVA automatico.</p></>}<div className="summary-row"><span>Totale IVA inclusa</span><strong>{formatCurrency(quote.totalCents)}</strong></div><div className="summary-row"><span>Incentivo ({quote.incentive || "nessuno"})</span><strong>- {formatCurrency(quote.incentiveAmountCents)}</strong></div><div className="summary-row summary-total"><span>Totale netto incentivo</span><strong>{formatCurrency(quote.netAfterIncentiveCents || quote.totalCents)}</strong></div><div className="margin-box">Margine stimato interno: <strong>{formatCurrency(quote.estimatedMarginCents)}</strong></div></div></section>
      <section className="card"><div className="card-header"><h2>Pagamento e note</h2></div><div className="card-body form-grid"><div><div className="kpi-label">Metodo</div><strong>{quote.paymentMethod || "—"}</strong></div><div><div className="kpi-label">Condizioni</div><strong style={{ whiteSpace: "pre-line" }}>{quote.paymentConditions || "—"}</strong></div>{paymentSchedule.length > 0 && <div className="span-full"><div className="kpi-label">Stato di avanzamento lavori</div><div className="table-wrap"><table className="table"><thead><tr><th>Rata</th><th>Percentuale</th><th>Importo</th><th>Scadenza</th></tr></thead><tbody>{paymentSchedule.map((entry, index) => <tr key={`${entry.label}-${index}`}><td>{entry.label}</td><td>{entry.percent}%</td><td>{formatCurrency(Math.round(quote.totalCents * Number(entry.percent || 0) / 100))}</td><td>{entry.dueDate ? formatDate(`${entry.dueDate}T12:00:00`) : "Da definire"}</td></tr>)}</tbody></table></div></div>}<div className="span-full"><div className="kpi-label">Note visibili</div><p style={{ whiteSpace: "pre-line" }}>{quote.visibleNotes || "—"}</p></div></div></section>
    </div><aside className="stack"><section className="card"><div className="card-header"><h3>PDF</h3></div><div className="card-body">{quote.lastPdfGeneratedAt ? <><p>Ultima generazione:<br /><strong>{formatDateTime(quote.lastPdfGeneratedAt)}</strong></p><a className="btn btn-secondary" href={`/api/quotes/${quote.id}/pdf`} target="_blank">Apri e stampa PDF</a></> : <p className="help-text">Il PDF non è ancora stato generato.</p>}</div></section><section className="card"><div className="card-header"><h3>Cronologia stato</h3></div><div className="card-body status-timeline">{quote.statusHistory.map((history) => <div className="timeline-item" key={history.id}><span className="timeline-dot" /><div><strong>{history.fromStatus ? `${history.fromStatus} → ` : ""}{history.toStatus}</strong><small>{formatDateTime(history.changedAt)}{history.note ? ` · ${history.note}` : ""}</small></div></div>)}</div></section></aside></div>
  </>;
}
