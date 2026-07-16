# SG Clima · Gestione preventivi

Gestionale locale in italiano per creare e seguire preventivi di climatizzazione, caldaie, fotovoltaico, pompe di calore, solare termico, wallbox e impiantistica.

## Avvio rapido su Windows

Requisiti: Node.js 22 o successivo e circa 500 MB liberi per il browser locale usato nella generazione PDF.

Aprire PowerShell nella cartella del progetto ed eseguire:

```powershell
npm install
npm run setup
npm run dev
```

Aprire poi [http://localhost:3100](http://localhost:3100).

`npm run setup` è non distruttivo: crea le cartelle mancanti, applica soltanto le migrazioni non ancora eseguite, genera Prisma, inserisce i dati demo se assenti e installa Chromium per i PDF. Non cancella dati esistenti.

## Comandi

```powershell
npm run dev       # sviluppo, porta 3100
npm run build     # build di produzione
npm run start     # avvio della build, porta 3100
npm run test      # test unitari, integrazione ed end-to-end
npm run test:unit # test Vitest senza E2E
npm run test:e2e  # solo flusso Playwright
npm run demo:pdf  # rigenera il PDF dimostrativo
```

## Dove sono salvati i dati

- Database SQLite: `storage/sg-clima.db`
- Logo: `storage/logos/`
- Schede tecniche: `storage/product-attachments/`
- PDF generati: `storage/generated-quotes/`
- Backup ZIP: `storage/backups/`
- Log errori: `storage/logs/error.log`
- PDF dimostrativo: `output/pdf/esempio-preventivo.pdf`

Tutto resta sul computer. L’uso ordinario non richiede Internet né servizi cloud.

## Uso essenziale

1. Aprire **Impostazioni** e verificare dati aziendali, logo, testi legali e valori predefiniti.
2. Creare o importare i **Clienti**.
3. Completare cataloghi **Prodotti** e **Servizi**. Le schede tecniche PDF si caricano dalla modifica prodotto.
4. Aprire **Preventivi → Crea preventivo** e seguire i sei passaggi.
5. Dalla scheda del preventivo usare **Genera PDF**, quindi **Apri PDF** per scaricare o stampare.
6. Controllare **Scadenze** per i preventivi da ricontattare.

Gli importi sono memorizzati in centesimi; costo d’acquisto e margine sono interni e non compaiono nel PDF. I dati di cliente e prodotto sono copiati nel preventivo per non alterare i documenti storici quando un’anagrafica cambia.

## Backup e ripristino

Da **Backup e ripristino**:

- **Esporta backup ZIP** salva database, logo, immagini, allegati e configurazioni.
- **Importa backup** valida manifest e percorsi; prima del ripristino crea automaticamente un nuovo backup dello stato corrente. Dopo il ripristino riavviare l’app.
- Le esportazioni CSV sono disponibili per clienti, prodotti e preventivi; l’importazione CSV è disponibile per clienti e prodotti.

Conservare almeno una copia dei backup anche su un supporto esterno.

## PDF e allegati

Il PDF è generato da HTML/CSS A4 con Playwright. Le righe lunghe vengono spostate su pagine economiche aggiuntive; condizioni e privacy restano sempre in coda. Per ogni preventivo si può scegliere di non allegare schede, allegarle tutte o selezionarle singolarmente. I PDF tecnici scelti vengono uniti al documento finale.

## Risoluzione problemi

- **Il PDF non viene generato:** eseguire nuovamente `npm run setup` per installare Chromium.
- **La porta 3100 è occupata:** avviare temporaneamente con `npx next dev -p 3200`.
- **Il database è bloccato:** chiudere eventuali altre istanze dell’app e riprovare.
- **Ripristino appena eseguito:** chiudere e riavviare `npm run dev`.

Non modificare manualmente `storage/sg-clima.db`; usare sempre le schermate dell’app o il ripristino backup.
