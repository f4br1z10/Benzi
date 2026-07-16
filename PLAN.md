# Piano di implementazione - SG Clima · Gestione preventivi

## Obiettivo

Applicazione gestionale locale, in italiano, per clienti, catalogo, preventivi, PDF, scadenze e backup di SG Clima S.r.l. Unipersonale.

## Architettura scelta

- Next.js App Router + TypeScript e React.
- SQLite locale con Prisma ORM.
- Route Handler REST con validazione Zod e transazioni Prisma.
- Interfaccia responsive in CSS nativo, senza dipendenze cloud.
- PDF A4 da template HTML/CSS con Playwright; unione schede tecniche con `pdf-lib`.
- Backup ZIP con database e cartelle storage; CSV con `papaparse`.
- Test unitari/integrati con Vitest e test end-to-end Playwright.

## Fasi

- [x] Analisi e rendering dei PDF di riferimento.
- [x] Schema Prisma, migrazione iniziale, seed e setup non distruttivo.
- [x] API clienti, categorie, prodotti, servizi e preventivi.
- [x] Dashboard e schermate anagrafiche.
- [x] Procedura guidata preventivo e configurazioni tecniche.
- [x] Template PDF fedele, stampa, download e allegati.
- [x] Scadenze, cronologia stato e promemoria.
- [x] Impostazioni, backup/ripristino e CSV.
- [x] Test unitari, integrazione ed end-to-end.
- [x] Generazione e confronto del PDF dimostrativo.
- [x] README e report di implementazione.

## Decisioni secondarie

- Gli importi sono salvati in centesimi per evitare errori di arrotondamento.
- I dati del cliente e delle righe sono congelati in snapshot JSON al momento dell'emissione.
- I configuratori tecnici sono salvati come JSON validato e restano modificabili nel singolo preventivo.
- I file sono conservati sotto `storage/`; soltanto le risorse grafiche generiche sono pubbliche.
- La scadenza automatica viene applicata in lettura e persistita dalle operazioni su dashboard/preventivi.
- Il logo demo è estratto dal documento di riferimento; può essere sostituito dalle impostazioni.

## Criteri di completamento

- Avvio con `npm install`, `npm run setup`, `npm run dev`.
- CRUD realmente persistente per le anagrafiche principali.
- Preventivo completo, duplicabile, eliminabile, stampabile ed esportabile.
- PDF demo in `output/pdf/esempio-preventivo.pdf`.
- Test verdi e build di produzione riuscita.
