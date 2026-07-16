import Link from "next/link";
import { prisma } from "@/server/prisma";
import { refreshExpiredQuotes } from "@/server/quotes";
import { customerDisplayName, formatCurrency, formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import QuoteActions from "@/components/QuoteActions";
export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await refreshExpiredQuotes();
  const p = await searchParams;
  const categoryId = Number(p.categoryId) || undefined;
  const where: any = {
    ...(p.status ? { status: p.status } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(p.city
      ? { customer: { addresses: { some: { city: { contains: p.city } } } } }
      : {}),
    ...(p.q
      ? {
          OR: [
            { number: { contains: p.q } },
            { subject: { contains: p.q } },
            { customer: { firstName: { contains: p.q } } },
            { customer: { lastName: { contains: p.q } } },
            { items: { some: { description: { contains: p.q } } } },
          ],
        }
      : {}),
  };
  const [quotes, categories] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: { customer: true, category: true },
      orderBy: { quoteDate: "desc" },
    }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: { position: "asc" },
    }),
  ]);
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Preventivi</h1>
          <p>Cerca, modifica, duplica, stampa ed esporta i preventivi.</p>
        </div>
        <Link href="/preventivi/nuovo" className="btn btn-primary">
          + Crea preventivo
        </Link>
      </div>
      <form className="card filter-card">
        <div className="filter-grid">
          <div className="field">
            <label>Ricerca</label>
            <input
              name="q"
              className="input"
              defaultValue={p.q}
              placeholder="Numero, cliente o prodotto"
            />
          </div>
          <div className="field">
            <label>Comune</label>
            <input name="city" className="input" defaultValue={p.city} />
          </div>
          <div className="field">
            <label>Categoria</label>
            <select
              name="categoryId"
              className="select"
              defaultValue={p.categoryId || ""}
            >
              <option value="">Tutte</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Stato</label>
            <select
              name="status"
              className="select"
              defaultValue={p.status || ""}
            >
              <option value="">Tutti</option>
              {[
                "BOZZA",
                "EMESSO",
                "INVIATO",
                "ACCETTATO",
                "RIFIUTATO",
                "SCADUTO",
                "ANNULLATO",
              ].map((s) => (
                <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary">Filtra</button>
        </div>
      </form>
      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Numero</th>
                <th>Cliente</th>
                <th>Categoria</th>
                <th>Data / Scadenza</th>
                <th>Totale</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <Link href={`/preventivi/${q.id}`} className="table-title">
                      {q.number}
                    </Link>
                    <div className="table-sub">{q.subject || "—"}</div>
                  </td>
                  <td>{customerDisplayName(q.customer)}</td>
                  <td>{q.category?.name || "Altro"}</td>
                  <td>
                    {formatDate(q.quoteDate)}
                    <div className="table-sub">
                      Scade {formatDate(q.expiryDate)}
                    </div>
                  </td>
                  <td>
                    <strong>{formatCurrency(q.totalCents)}</strong>
                  </td>
                  <td>
                    <StatusBadge status={q.status} />
                  </td>
                  <td>
                    <QuoteActions
                      id={q.id}
                      number={q.number}
                      status={q.status}
                      hasPdf={!!q.lastPdfPath}
                      compact
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!quotes.length && (
            <div className="empty">
              <strong>Nessun preventivo trovato</strong>Crea il primo preventivo
              o modifica i filtri.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
