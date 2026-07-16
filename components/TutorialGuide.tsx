"use client";

import Link from "next/link";
import { useState } from "react";

const guides = [
  {
    id: "iniziare",
    number: "01",
    title: "Primi passi",
    subtitle: "Configura l’app prima di iniziare",
    intro: "In pochi minuti puoi preparare dati aziendali, regole di pagamento e modello PDF.",
    steps: [
      "Apri Impostazioni e controlla ragione sociale, contatti e indirizzo.",
      "Carica il logo aziendale che comparirà in tutti i nuovi PDF.",
      "Verifica validità, IVA, pagamento, acconto e tempi di consegna predefiniti.",
      "Leggi i testi delle condizioni di fornitura e della privacy: sono modificabili e vengono stampati nel PDF.",
    ],
    tip: "Le impostazioni sono valori iniziali: puoi sempre modificarli nel singolo preventivo.",
    action: { href: "/impostazioni", label: "Apri Impostazioni" },
  },
  {
    id: "clienti",
    number: "02",
    title: "Gestire i clienti",
    subtitle: "Crea anagrafiche complete e senza duplicati",
    intro: "Ogni preventivo parte da un cliente. Puoi registrare privati e aziende con indirizzi distinti.",
    steps: [
      "Apri Clienti e premi Crea cliente.",
      "Scegli Privato o Azienda e compila almeno nome/cognome oppure ragione sociale.",
      "Inserisci residenza o sede; usa Copia dalla residenza per compilare velocemente l’indirizzo di installazione.",
      "Salva. Se codice fiscale o partita IVA esistono già, l’app ti chiede conferma prima di creare il duplicato.",
      "Usa la ricerca per nome, telefono, e-mail, codice fiscale o partita IVA.",
    ],
    tip: "Dal primo passaggio del preventivo puoi creare anche un cliente rapido senza abbandonare il lavoro.",
    action: { href: "/clienti?new=1", label: "Crea un cliente" },
  },
  {
    id: "catalogo",
    number: "03",
    title: "Prodotti e servizi",
    subtitle: "Prepara il catalogo riutilizzabile",
    intro: "Prodotti e servizi memorizzano descrizioni, prezzi e IVA da richiamare nei preventivi.",
    steps: [
      "In Prodotti inserisci codice, nome, categoria, marca, modello e prezzi.",
      "Il costo d’acquisto serve per il margine interno e non viene mai stampato nel PDF.",
      "Scrivi la descrizione predefinita: può contenere più righe e sarà comunque modificabile nel preventivo.",
      "Dalla modifica prodotto puoi caricare una o più schede tecniche PDF.",
      "In Servizi inserisci installazione, manodopera, pratiche e opere con prezzo anche pari a zero: il prezzo resta modificabile nel preventivo.",
    ],
    tip: "Disattivare un prodotto o servizio lo nasconde dalle nuove selezioni ma conserva i vecchi preventivi.",
    action: { href: "/prodotti", label: "Apri il catalogo" },
  },
  {
    id: "preventivo",
    number: "04",
    title: "Creare un preventivo",
    subtitle: "La procedura guidata in sei passaggi",
    intro: "Il wizard accompagna dalla scelta del cliente fino all’anteprima pronta per l’emissione.",
    steps: [
      "Cliente: seleziona l’anagrafica e l’indirizzo di installazione.",
      "Informazioni: indica data, validità, venditore, categoria, oggetto e configurazione tecnica.",
      "Prodotti e servizi: aggiungi righe dal catalogo oppure righe libere, titoli e testi.",
      "Modifica quantità, unità, prezzo, sconto e IVA; trascina le righe per riordinarle. Il riepilogo si aggiorna subito.",
      "Pagamento: controlla acconto, saldo e finanziamento. Oltre la soglia configurata viene proposto il 50/50.",
      "Incentivi e note: scegli detrazione, note visibili e schede tecniche da allegare.",
      "Anteprima: salva come bozza oppure salva ed emetti.",
    ],
    tip: "Il margine verde è solo interno. Non appare mai nel preventivo consegnato al cliente.",
    action: { href: "/preventivi/nuovo", label: "Crea un preventivo" },
  },
  {
    id: "pdf-stati",
    number: "05",
    title: "PDF e stati",
    subtitle: "Genera, stampa e segui l’esito",
    intro: "Dopo il salvataggio puoi produrre il documento A4 e tenere traccia dell’avanzamento commerciale.",
    steps: [
      "Apri il preventivo salvato e premi Genera PDF.",
      "Premi Apri PDF per controllarlo, scaricarlo o stamparlo.",
      "Se modifichi il preventivo, salva e genera nuovamente il PDF.",
      "Usa Segna inviato, Accetta o Rifiuta per aggiornare lo stato.",
      "La cronologia registra data e ora di ogni cambio; i preventivi oltre la validità diventano Scaduti automaticamente.",
    ],
    tip: "La duplicazione crea una nuova bozza con un nuovo numero, senza cambiare il documento originale.",
    action: { href: "/preventivi", label: "Vedi i preventivi" },
  },
  {
    id: "scadenze",
    number: "06",
    title: "Scadenze",
    subtitle: "Ricontatta i clienti al momento giusto",
    intro: "Cinque giorni prima della scadenza il preventivo entra nella lista delle attività da gestire.",
    steps: [
      "Apri Scadenze e scegli Oggi, Prossimi 5 giorni, Scaduti o Posticipati.",
      "Consulta cliente, contatti, importo e giorni mancanti.",
      "Premi Segna ricontattato e registra una nota sulla conversazione.",
      "Se serve più tempo, usa Posticipa e scegli una nuova data.",
    ],
    tip: "I promemoria sono completamente locali: non inviano automaticamente e-mail o messaggi.",
    action: { href: "/scadenze", label: "Apri Scadenze" },
  },
  {
    id: "backup",
    number: "07",
    title: "Backup e sicurezza",
    subtitle: "Proteggi tutto l’archivio locale",
    intro: "Un backup comprende database, logo, immagini, schede tecniche, impostazioni e testi legali.",
    steps: [
      "Apri Backup e ripristino e premi Esporta backup ZIP.",
      "Conserva il file su un disco esterno o in una cartella protetta.",
      "Per ripristinare, seleziona il file ZIP: l’app crea prima una copia automatica dello stato corrente.",
      "Dopo un ripristino riavvia l’applicazione.",
      "Usa i CSV quando vuoi analizzare o trasferire separatamente clienti, prodotti o preventivi.",
    ],
    tip: "È consigliato creare almeno un backup a settimana e prima di modifiche importanti al catalogo.",
    action: { href: "/backup", label: "Gestisci i backup" },
  },
];

export default function TutorialGuide() {
  const [activeId, setActiveId] = useState(guides[0].id);
  const active = guides.find((guide) => guide.id === activeId) || guides[0];
  const currentIndex = guides.findIndex((guide) => guide.id === active.id);

  return (
    <div className="tutorial-layout">
      <nav className="card tutorial-list" aria-label="Argomenti del tutorial">
        {guides.map((guide) => (
          <button
            key={guide.id}
            className={`tutorial-topic ${active.id === guide.id ? "active" : ""}`}
            onClick={() => setActiveId(guide.id)}
          >
            <span>{guide.number}</span>
            <div><strong>{guide.title}</strong><small>{guide.subtitle}</small></div>
          </button>
        ))}
      </nav>

      <article className="card tutorial-detail">
        <div className="tutorial-progress"><span style={{ width: `${((currentIndex + 1) / guides.length) * 100}%` }} /></div>
        <div className="tutorial-detail-head">
          <span className="tutorial-number">{active.number}</span>
          <div><p>GUIDA OPERATIVA</p><h2>{active.title}</h2></div>
        </div>
        <p className="tutorial-intro">{active.intro}</p>
        <ol className="tutorial-steps">
          {active.steps.map((step, index) => (
            <li key={step}><span>{index + 1}</span><p>{step}</p></li>
          ))}
        </ol>
        <div className="tutorial-tip"><strong>Da ricordare</strong><p>{active.tip}</p></div>
        <div className="tutorial-footer">
          <span>{currentIndex + 1} di {guides.length}</span>
          <div className="actions">
            <button className="btn btn-secondary" disabled={currentIndex === 0} onClick={() => setActiveId(guides[currentIndex - 1]?.id)}>← Precedente</button>
            {currentIndex < guides.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setActiveId(guides[currentIndex + 1].id)}>Prossima guida →</button>
            ) : (
              <Link className="btn btn-primary" href={active.action.href}>{active.action.label} →</Link>
            )}
          </div>
        </div>
        {currentIndex < guides.length - 1 && <Link className="tutorial-action" href={active.action.href}>Prova ora: {active.action.label} →</Link>}
      </article>
    </div>
  );
}
