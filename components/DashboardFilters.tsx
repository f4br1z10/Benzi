"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent } from "react";
export default function DashboardFilters({ categories }: { categories: { id: number; name: string }[] }) {
  const router = useRouter(); const params = useSearchParams();
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const next = new URLSearchParams(); for (const [key,value] of form) if (String(value)) next.set(key,String(value)); router.push(`/?${next}`); }
  return <form className="card filter-card" onSubmit={submit}><div className="filter-grid">
    <div className="field"><label htmlFor="q">Ricerca libera</label><input id="q" name="q" className="input" placeholder="Cliente, numero o prodotto…" defaultValue={params.get("q") || ""}/></div>
    <div className="field"><label htmlFor="from">Dal</label><input id="from" name="from" type="date" className="input" defaultValue={params.get("from") || ""}/></div>
    <div className="field"><label htmlFor="to">Al</label><input id="to" name="to" type="date" className="input" defaultValue={params.get("to") || ""}/></div>
    <div className="field"><label htmlFor="categoryId">Categoria</label><select id="categoryId" name="categoryId" className="select" defaultValue={params.get("categoryId") || ""}><option value="">Tutte</option>{categories.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
    <div className="field"><label htmlFor="status">Stato</label><select id="status" name="status" className="select" defaultValue={params.get("status") || ""}><option value="">Tutti</option><option value="BOZZA">Bozza</option><option value="EMESSO">Emesso</option><option value="INVIATO">Inviato</option><option value="ACCETTATO">Accettato</option><option value="RIFIUTATO">Rifiutato</option><option value="SCADUTO">Scaduto</option></select></div>
    <button className="btn btn-primary" type="submit">Applica filtri</button>
  </div></form>;
}
