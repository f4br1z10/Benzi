import Link from "next/link";
import { prisma } from "@/server/prisma";
import { refreshExpiredQuotes } from "@/server/quotes";
import { formatCurrency, formatDate, customerDisplayName } from "@/lib/format";
import { daysUntil } from "@/lib/dates";
import StatusBadge from "@/components/StatusBadge";
import DashboardFilters from "@/components/DashboardFilters";

type Search = Promise<Record<string, string | string[] | undefined>>;
export default async function Dashboard({ searchParams }: { searchParams: Search }) {
  await refreshExpiredQuotes(); const p = await searchParams; const q = typeof p.q === "string" ? p.q : undefined; const status = typeof p.status === "string" ? p.status : undefined;
  const categoryId = typeof p.categoryId === "string" ? Number(p.categoryId) : undefined; const from = typeof p.from === "string" && p.from ? new Date(`${p.from}T00:00:00`) : undefined; const to = typeof p.to === "string" && p.to ? new Date(`${p.to}T23:59:59`) : undefined;
  const where = { ...(status ? { status } : {}), ...(categoryId ? { categoryId } : {}), ...(from || to ? { quoteDate: { gte: from, lte: to } } : {}), ...(q ? { OR: [{ number: { contains: q } }, { subject: { contains: q } }, { customer: { firstName: { contains: q } } }, { customer: { lastName: { contains: q } } }, { items: { some: { description: { contains: q } } } }] } : {}) };
  const [quotes, categories, reminders] = await Promise.all([
    prisma.quote.findMany({ where, include: { customer: true, category: true }, orderBy: { updatedAt: "desc" }, take: 12 }),
    prisma.category.findMany({ where: { active: true }, include: { _count: { select: { quotes: true } } }, orderBy: { position: "asc" } }),
    prisma.quoteReminder.findMany({ where: { contactedAt: null, dueAt: { lte: new Date() } }, include: { quote: { include: { customer: true } } }, orderBy: { dueAt: "asc" }, take: 6 })
  ]);
  const all = await prisma.quote.findMany({ where }); const definitive = all.filter((x) => x.status !== "BOZZA" && x.status !== "ANNULLATO");
  const total = all.reduce((sum,x)=>sum+x.totalCents,0); const accepted = all.filter((x)=>x.status==="ACCETTATO").reduce((s,x)=>s+x.totalCents,0); const waiting = all.filter((x)=>["EMESSO","INVIATO"].includes(x.status)).reduce((s,x)=>s+x.totalCents,0); const expired = all.filter((x)=>x.status==="SCADUTO").reduce((s,x)=>s+x.totalCents,0); const conversion = definitive.length ? all.filter((x)=>x.status==="ACCETTATO").length/definitive.length*100 : 0;
  return <>
    <div className="page-header"><div><h1>Buongiorno</h1><p>Qui trovi l’andamento dei preventivi e le attività da seguire.</p></div><div className="header-actions"><Link href="/clienti?new=1" className="btn btn-secondary">+ Nuovo cliente</Link><Link href="/prodotti?new=1" className="btn btn-secondary">+ Nuovo prodotto</Link><Link href="/preventivi/nuovo" className="btn btn-primary">+ Crea preventivo</Link></div></div>
    <DashboardFilters categories={categories}/>
    <div className="kpi-grid">
      <div className="card kpi"><div className="kpi-label">Preventivi</div><div className="kpi-value">{all.length}</div><div className="kpi-note">nel periodo selezionato</div></div>
      <div className="card kpi"><div className="kpi-label">Valore totale</div><div className="kpi-value">{formatCurrency(total)}</div><div className="kpi-note">incluse bozze</div></div>
      <div className="card kpi"><div className="kpi-label">Accettati</div><div className="kpi-value">{formatCurrency(accepted)}</div><div className="kpi-note">valore acquisito</div></div>
      <div className="card kpi"><div className="kpi-label">In attesa</div><div className="kpi-value">{formatCurrency(waiting)}</div><div className="kpi-note">emessi o inviati</div></div>
      <div className="card kpi"><div className="kpi-label">Scaduti</div><div className="kpi-value">{formatCurrency(expired)}</div><div className="kpi-note">da recuperare</div></div>
      <div className="card kpi"><div className="kpi-label">Conversione</div><div className="kpi-value">{conversion.toFixed(1).replace(".",",")}%</div><div className="kpi-note">bozze escluse</div></div>
    </div>
    <div className="category-grid">{categories.map((category)=><Link href={`/?categoryId=${category.id}`} key={category.id} className="card category-card"><strong>{category.name}</strong><span className="category-count">{category._count.quotes}</span></Link>)}</div>
    <div className="dashboard-columns"><section className="card"><div className="card-header"><h2>Preventivi recenti</h2><Link href="/preventivi" className="btn btn-ghost btn-sm">Vedi tutti →</Link></div><div className="table-wrap"><table className="table"><thead><tr><th>Preventivo</th><th>Cliente</th><th>Categoria</th><th>Data</th><th>Importo</th><th>Stato</th></tr></thead><tbody>{quotes.map((quote)=><tr key={quote.id}><td><Link className="table-title" href={`/preventivi/${quote.id}`}>{quote.number}</Link><div className="table-sub">{quote.subject || "—"}</div></td><td>{customerDisplayName(quote.customer)}</td><td>{quote.category?.name || "Altro"}</td><td>{formatDate(quote.quoteDate)}</td><td><strong>{formatCurrency(quote.totalCents)}</strong></td><td><StatusBadge status={quote.status}/></td></tr>)}</tbody></table>{!quotes.length&&<div className="empty"><strong>Nessun preventivo</strong>Modifica i filtri o crea il primo preventivo.</div>}</div></section>
      <aside className="card"><div className="card-header"><h2>Da ricontattare</h2><Link href="/scadenze" className="btn btn-ghost btn-sm">Tutte →</Link></div><div className="card-body">{reminders.map((r)=><div className="reminder" key={r.id}><div className="reminder-head"><strong>{customerDisplayName(r.quote.customer)}</strong><span className="days-pill">{daysUntil(r.quote.expiryDate) < 0 ? "Scaduto" : `${daysUntil(r.quote.expiryDate)} giorni`}</span></div><div className="reminder-meta">{r.quote.number} · {formatCurrency(r.quote.totalCents)}<br/>{r.quote.customer.phone || "Telefono non indicato"}</div><Link href={`/preventivi/${r.quote.id}`} className="btn btn-secondary btn-sm">Apri preventivo</Link></div>)}{!reminders.length&&<div className="empty"><strong>Nessuna urgenza</strong>Non ci sono promemoria da gestire.</div>}</div></aside>
    </div>
  </>;
}
