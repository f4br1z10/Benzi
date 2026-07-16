# Report di implementazione

## Architettura

SG Clima · Gestione preventivi usa Next.js 15 con App Router, React 19 e TypeScript. Le pagine chiamano Route Handler locali con validazione Zod. Prisma è l’ORM e SQLite il database. Le operazioni critiche su preventivi, righe, stato e snapshot usano transazioni.

La migrazione SQL è versionata in `prisma/migrations/20260713160000_init/migration.sql`. In questo ambiente Windows il binario `prisma migrate` terminava senza diagnostica pur validando correttamente lo schema; `scripts/migrate.ts` applica gli stessi file SQL in ordine tramite SQLite integrato in Node e registra ogni versione in `AppMigration`. Prisma Client resta l’unico accesso ORM usato dall’applicazione.

## Database

Tabelle principali:

- `CompanySettings`, `LegalDocument`, `AppSetting`, `PaymentMethod`
- `Customer`, `CustomerAddress`
- `Category`, `Product`, `ProductAttachment`, `Service`
- `Quote`, `QuoteItem`, `QuoteStatusHistory`, `QuoteReminder`, `QuoteAttachmentSelection`
- `SystemLog`

Gli importi sono interi in centesimi. Quantità, aliquote e percentuali sono decimali. `Quote.customerSnapshot`, `Quote.categorySnapshot`, `QuoteItem.productSnapshot` e `QuoteItem.serviceSnapshot` congelano i dati storici. Configurazioni tecniche specifiche sono JSON testuale validato dall’app.

## Funzionalità completate

- Dashboard con KPI, conversione senza bozze, categorie, filtri e promemoria.
- Stati Bozza, Emesso, Inviato, Accettato, Rifiutato, Scaduto e Annullato; scadenza automatica e cronologia.
- CRUD clienti con due indirizzi, copia residenza/installazione, archivio e controllo duplicati con conferma.
- Categorie ordinabili/disattivabili; CRUD prodotti e servizi; costi interni; schede PDF.
- Wizard preventivo in sei passaggi, cliente rapido, configuratori tecnici, righe trascinabili/duplicabili, titoli e testo libero.
- Calcoli in tempo reale di imponibile, sconto, IVA, totale, acconto/saldo e margine interno.
- Numero progressivo configurabile e snapshot storici.
- PDF A4, stampa/download, rigenerazione con data/ora e pagine economiche aggiuntive.
- Allegati tecnici: nessuno, tutti o selezione singola; fusione in un unico PDF.
- Promemoria odierni, a cinque giorni, scaduti e posticipati; note di contatto.
- Impostazioni aziendali, logo, valori predefiniti e editor dei testi legali.
- Backup ZIP validato con copia preventiva automatica; import/export CSV.
- Log locale e protezioni su nomi file, tipo/dimensione upload e percorsi storage.

## PDF di riferimento

I due PDF iniziali sono stati copiati in `docs/` e renderizzati localmente per l’analisi. Il logo demo è stato estratto dalla prima pagina del modello.

Il PDF prodotto mantiene:

- A4, numero pagina in cerchio blu, intestazione aziendale e logo;
- due tabelle azzurre, tabella opere, riepilogo, nota fiscale, note e firma;
- condizioni e privacy complete, modificabili e mantenute dopo tutte le pagine economiche;
- formati italiani di date, euro e caratteri accentati.

Il file verificato è `output/pdf/esempio-preventivo.pdf`, tre pagine e 121.802 byte nella generazione di controllo. Il confronto renderizzato non ha mostrato tagli o sovrapposizioni.

Differenze note rispetto all’originale:

- il font originale incorporato non è disponibile; viene usato Arial/Arial Narrow con gerarchia e densità equivalenti;
- il modello di riferimento indica tre importi pari a 1.090,00 €, 1.390,00 € e 4.290,00 €, che sommano 6.770,00 €, ma visualizza un totale di 7.630,00 €. Il seed conserva il totale esposto nel PDF originale; un successivo salvataggio dal wizard ricalcola matematicamente il totale dalle righe;
- la fedeltà è strutturale e visiva, non pixel-perfect, come consentito dal brief.

## Test eseguiti

- TypeScript: `npx tsc --noEmit` riuscito.
- Build: `npm run build` riuscita, 21 pagine/route compilate.
- Vitest: 17 test complessivi, tutti verdi, inclusa la conversione degli importi digitati.
- Playwright E2E: flusso completo cliente/preventivo/PDF e regressione sul prezzo dei servizi inizialmente a zero, entrambi verdi.
- Test PDF integrato: file maggiore di 10 KB.
- Test backup integrato: archivio ZIP maggiore di 1 KB.

## Comandi

```powershell
npm install
npm run setup
npm run dev
```

Dashboard: `http://localhost:3100`.

## Limiti residui

- Non sono inviate e-mail o notifiche di sistema: i promemoria sono intenzionalmente locali.
- L’import CSV riconosce direttamente il formato esportato dall’app; tracciati di terzi vanno riallineati alle intestazioni previste.
- Il ripristino sostituisce il database e richiede il riavvio dell’app, indicato anche nell’interfaccia.
