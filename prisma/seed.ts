import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import path from "node:path";
import { INITIAL_CATEGORIES } from "../lib/constants";
import { slugify } from "../lib/format";
import { calculateExpiryDate } from "../lib/dates";
import { calculateLine } from "../lib/calculations";

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), "storage", "sg-clima.db").replaceAll("\\", "/")}` });

const CONDITIONS = `# NOTE TECNICHE E CONDIZIONI DI FORNITURA BENI E SERVIZI

## 1. Opere murarie e ripristini

- **Opere murarie e pittoriche:** Sono escluse dal presente preventivo tutte le opere murarie come l'esecuzione di tracce nei muri, la chiusura delle stesse, i fori di carotaggio su cemento armato o pietra spessa, e i ripristini di intonaco e tinteggiatura, salvo diversi accordi preventivati con il cliente.
- **Passaggi e incassi:** Eventuali ripristini di tracce per il passaggio dei tubi della condensa o delle linee frigorifere/idrauliche rimangono a totale carico del Cliente, salvo diversi accordi preventivati con il cliente.
- **Ponteggi, mezzi di elevazione:** sono esclusi dal preventivo l’installazione di ponteggi o l’intervento di piattaforme aeree, salvo diversi accordi preventivati con il cliente.
- **Copertura:** Resta a carico del cliente eventuale copertura da agenti atmosferici ed umidità per tutti i prodotti con classificazione IP non adatta all’uso esterno.

## 2. Alimentazione e potenza contatore

- **Allacciamento elettrico:** Il Fornitore provvede al collegamento elettrico delle unità alle linee esistenti predisposte dal Cliente in prossimità delle macchine. È esclusa la creazione di nuove linee elettriche dal quadro generale o l'adeguamento dell'impianto elettrico dell'immobile, salvo diversi accordi preventivati con il cliente.
- **Verifica potenza:** Rimane a carico del Cliente la verifica con il proprio fornitore di energia elettrica affinché la potenza del contatore (kW) sia adeguata ai nuovi carichi termici installati (specialmente in caso di più climatizzatori).
- **Messa a terra:** Rimane a carico del cliente eventuale adeguamento della messa a terra nel caso non sia più idonea per i nuovi carichi elettrici.

## 3. Permessi condominiali e decoro urbano

- **Autorizzazioni:** Il Cliente è l'unico responsabile dell'ottenimento di autorizzazioni condominiali, permessi comunali (es. vincoli storici, paesaggistici o di decoro architettonico per il posizionamento dei motori esterni dei climatizzatori) o delibere per lo scarico a parete della caldaia ove consentito. SG Clima S.r.l. Unipersonale declina ogni responsabilità in merito. Il cliente sarà informato delle normative vigenti in merito all’opera da realizzare.

## 4. Incentivi fiscali e detrazioni

**Pagamenti Tracciabili:** Per poter accedere alle detrazioni fiscali o alle pratiche di Conto Termico 3.0, i pagamenti dovranno essere tassativamente eseguiti tramite il "bonifico parlante" (per detrazioni) o secondo le precise modalità indicate da SG Clima S.r.l. Unipersonale in fase di fatturazione. Pagamenti eseguiti in modo errato dal Cliente che pregiudichino l'incentivo non saranno imputabili al Fornitore.

## 5. Tutele sul cantiere

**Responsabilità su Opere di Terzi:**

- **Predisposizioni esistenti:** Qualora l'installazione avvenga su predisposizioni o tubazioni già esistenti realizzate da terzi, SG Clima S.r.l. Unipersonale non risponde di eventuali perdite di gas refrigerante, strozzature dei tubi, infiltrazioni, residui di umidità o malfunzionamenti legati alla scarsa qualità o errata posa della predisposizione stessa.
- **Decadimento garanzia:** eventuali malfunzionamenti derivanti da interventi o manomissione da terzi estranei ad SG Clima S.r.l. possono essere causa di decadimento di garanzia.

**Esonero Custodia Cantiere:**

- **Custodia materiali:** Dal momento in cui i materiali (caldaie, motori, split) vengono consegnati presso l'immobile del Cliente, l'obbligo di custodia ricade sul Cliente stesso. Il Fornitore declina ogni responsabilità per furti, danneggiamenti o atti vandalici subiti dai materiali lasciati in cantiere non imputabili al personale della ditta.`;

const PRIVACY = `# INFORMATIVA PRIVACY E RICHIESTA DOCUMENTI PER FATTURAZIONE E INCENTIVI FISCALI

### (Ai sensi dell'art. 13 del Regolamento UE 2016/679 - GDPR)

La società **SG Clima S.r.l. Unipersonale**, con sede legale in Albano Laziale (RM), in qualità di **Titolare del trattamento**, La informa che per l'esecuzione del contratto, l'emissione delle fatture e l'istruzione delle pratiche di incentivo fiscale (es. Conto Termico 3.0, Detrazioni Fiscali), è indispensabile raccogliere e trattare alcuni Suoi documenti personali e dell'immobile.

## 1. Tipologia di documenti e dati raccolti

A titolo esemplificativo ma non esaustivo, Le verranno richiesti:

- **Per la fatturazione e anagrafica:** Documento d'identità in corso di validità, Codice Fiscale o Tessera Sanitaria, dati di contatto (telefono ed e-mail).
- **Per le pratiche di incentivo (GSE / ENEA):** Visura catastale aggiornata dell'immobile, planimetrie, foto dello stato dei luoghi (prima e dopo i lavori), libretto d'impianto esistente, fatture di precedenti consumi (bollette elettriche o gas), atto di proprietà o dichiarazione di consenso del proprietario (in caso di locazione/comodato), estremi del conto corrente bancario (IBAN) per l'accredito o per il mandato all'incasso. Eventuali integrazioni di documenti se richiesti.

## 2. Finalità e base giuridica del trattamento

Il trattamento di questi dati e documenti è finalizzato esclusivamente a:

1. **Adempimenti contrattuali e fiscali:** Emissione di preventivi, fatture, note di credito e comunicazioni obbligatorie all’Agenzia delle Entrate.
2. **Istruzione e gestione delle pratiche di incentivo:** Trasmissione dei dati agli enti competenti (**GSE - Gestore Servizi Energetici**, ENEA, ecc.) e allo **Studio Tecnico professionale esterno** incaricato della perizia. La base giuridica del trattamento è l’adempimento degli obblighi contrattuali (Art. 6, lett. b, GDPR) e normativi (Art. 6, lett. c, GDPR).

## 3. Modalità di conservazione e sicurezza

I documenti consegnati verranno trattati sia in formato cartaceo che digitale attraverso sistemi protetti. Saranno conservati per il periodo minimo stabilito dalla legge in materia fiscale e civile (10 anni) e per la durata dei controlli previsti dagli enti erogatori degli incentivi (GSE), ENEA ed eventuali terze parti necessarie allo sviluppo.

## 4. Comunicazione dei dati a terzi

I Suoi documenti non saranno diffusi, ma verranno comunicati esclusivamente a:

- Lo Studio Tecnico / società incaricato/a della progettazione/perizia.
- Il GSE o altri enti pubblici preposti alla concessione degli incentivi.
- Il commercialista/consulente fiscale del Titolare per la contabilità.`;

async function seed() {
  const legacyBoiler = await prisma.category.findUnique({ where: { slug: "caldaia" } });
  const gasBoiler = await prisma.category.findUnique({ where: { slug: "caldaia-a-gas" } });
  if (legacyBoiler && !gasBoiler) {
    await prisma.category.update({
      where: { id: legacyBoiler.id },
      data: { name: "Caldaia a gas", slug: "caldaia-a-gas" },
    });
  }
  for (const [position, name] of INITIAL_CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: { name, position, active: true },
      create: { name, slug: slugify(name), position }
    });
  }

  const paymentNames = ["Bonifico bancario", "Finanziamento", "Misto", "Stato di avanzamento lavori"];
  for (const [position, name] of paymentNames.entries()) {
    await prisma.paymentMethod.upsert({ where: { name }, update: { position }, create: { name, position } });
  }

  const bonifico = await prisma.paymentMethod.findUniqueOrThrow({ where: { name: "Bonifico bancario" } });
  await prisma.companySettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1, businessName: "SG Clima S.r.l. Unipersonale", vatNumber: "17407831001",
      address: "Piazza A. Gramsci", streetNumber: "12", postalCode: "00041", city: "Albano Laziale", province: "RM",
      phone: "06 86 93 59 01", email: "albanolaziale.edison@gmail.com",
      openingHours: "Lun-Ven 9.00-13.00 / 14.00-17.30\nSab. 9.00-12.00",
      logoPath: "storage/logos/sg-clima-demo.png", defaultSeller: "SG Clima S.r.l.", defaultValidityDays: 30,
      defaultDeliveryTime: "30 giorni", defaultPaymentMethodId: bonifico.id,
      defaultPaymentConditions: "Acconto 50% per ordine\nSaldo 50% alla consegna", defaultVatRate: 22,
      defaultTaxNote: "*L’IVA calcolata rientra nell’agevolazione per beni significativi Articolo 7, comma 1, lettera b, della Legge 488/1999",
      standardNotes: "È possibile richiedere un finanziamento totale o parziale.", quoteNumberFormat: "PREV-{YYYY}-{NNNN}",
      depositThresholdCents: 299900, defaultDepositPercent: 50
    }
  });

  await prisma.legalDocument.upsert({ where: { type: "CONDIZIONI" }, update: {}, create: { type: "CONDIZIONI", title: "Note tecniche e condizioni di fornitura beni e servizi", content: CONDITIONS } });
  await prisma.legalDocument.upsert({ where: { type: "PRIVACY" }, update: {}, create: { type: "PRIVACY", title: "Informativa privacy e richiesta documenti per fatturazione e incentivi fiscali", content: PRIVACY } });

  const serviceSeeds = ["Installazione", "Manodopera", "Sopralluogo", "Smaltimento", "Pratica ENEA", "Dichiarazione di conformità", "Pratica FGAS", "Lavaggio impianto", "Intubamento canna fumaria", "Noleggio piattaforma aerea"];
  const otherCategory = await prisma.category.findUniqueOrThrow({ where: { slug: "impiantistica" } });
  for (const name of serviceSeeds) {
    const existing = await prisma.service.findFirst({ where: { name } });
    if (!existing) await prisma.service.create({ data: { name, categoryId: otherCategory.id, description: name, unit: "corpo", vatRate: 22 } });
  }

  let customer = await prisma.customer.findFirst({ where: { firstName: "Alfonso", lastName: "Demo" }, include: { addresses: true } });
  if (!customer) customer = await prisma.customer.create({
    data: {
      type: "PRIVATO", firstName: "Alfonso", lastName: "Demo", phone: "06 0000000", email: "alfonso.demo@example.local",
      addresses: { create: [
        { type: "RESIDENZA", city: "Albano Laziale", province: "RM", isDefault: true },
        { type: "INSTALLAZIONE", city: "Albano Laziale", province: "RM", isDefault: true }
      ] }
    }, include: { addresses: true }
  });

  const clima = await prisma.category.findUniqueOrThrow({ where: { slug: "climatizzatore" } });
  const pdc = await prisma.category.findUniqueOrThrow({ where: { slug: "pompa-di-calore" } });
  const products = [
    { internalCode: "CLI-SAM-CEBU-18", name: "Climatizzatore Samsung Cebu S2 18000 BTU", categoryId: clima.id, brand: "Samsung", model: "Cebu S2", power: "18000 BTU", salePriceInclVatCents: 109000, salePriceExclVatCents: 89344, purchaseCostCents: 65000, quoteDescription: "Climatizzatore Samsung Cebu S2 18000 BTU\nManodopera e materiale necessario all’installazione\nDichiarazione di conformità, pratica FGAS" },
    { internalCode: "CLI-SAM-CEBU-09", name: "Climatizzatore Samsung Cebu S2 9000 BTU", categoryId: clima.id, brand: "Samsung", model: "Cebu S2", power: "9000 BTU", salePriceInclVatCents: 139000, salePriceExclVatCents: 113934, purchaseCostCents: 79000, quoteDescription: "Climatizzatore Samsung Cebu S2 9000 BTU\nManodopera e materiale necessario all’installazione\nDichiarazione di conformità, pratica FGAS" },
    { internalCode: "PDC-SAM-R290-26", name: "Pompa di calore ACS Samsung R290 New 2026", categoryId: pdc.id, brand: "Samsung", model: "R290 New 2026", salePriceInclVatCents: 429000, salePriceExclVatCents: 351639, purchaseCostCents: 280000, quoteDescription: "Pompa di calore ACS Samsung R290 New 2026\nManodopera e materiale necessario all’installazione come tubazioni e filtro anticalcare.\nDichiarazione di conformità." }
  ];
  for (const product of products) {
    await prisma.product.upsert({ where: { internalCode: product.internalCode }, update: {}, create: { ...product, vatRate: 22, unit: "pz" } });
  }

  const quoteExists = await prisma.quote.findUnique({ where: { number: "PREV-2026-0001" } });
  if (!quoteExists) {
    const dbProducts = await prisma.product.findMany({ where: { internalCode: { in: products.map((p) => p.internalCode) } }, orderBy: { internalCode: "asc" } });
    const order = ["CLI-SAM-CEBU-18", "CLI-SAM-CEBU-09", "PDC-SAM-R290-26"];
    dbProducts.sort((a, b) => order.indexOf(a.internalCode) - order.indexOf(b.internalCode));
    const quoteDate = new Date("2026-06-22T12:00:00.000Z");
    const itemData = dbProducts.map((product, position) => {
      const { marginCents: _marginCents, ...values } = calculateLine({ quantity: 1, unitPriceCents: product.salePriceInclVatCents, vatRate: 22, priceIncludesVat: true, purchaseCostCents: product.purchaseCostCents });
      return { type: "PRODOTTO", productId: product.id, position, description: product.quoteDescription || product.name, quantity: 1, unit: "pz", unitPriceCents: product.salePriceInclVatCents, priceIncludesVat: true, vatRate: 22, purchaseCostCents: product.purchaseCostCents, productSnapshot: JSON.stringify(product), ...values };
    });
    const customerSnapshot = JSON.stringify({ ...customer, displayName: "Alfonso", address: customer.addresses.find((a) => a.type === "INSTALLAZIONE") });
    await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({ data: {
        number: "PREV-2026-0001", customerId: customer.id, categoryId: clima.id, status: "EMESSO", quoteDate,
        validityDays: 30, expiryDate: calculateExpiryDate(quoteDate, 30), seller: "SG Clima S.r.l.", subject: "Efficientamento",
        deliveryTime: "30 giorni", customerSnapshot, installationAddressSnapshot: JSON.stringify(customer.addresses.find((a) => a.type === "INSTALLAZIONE")),
        categorySnapshot: JSON.stringify(clima), paymentMethod: "Bonifico bancario", paymentConditions: "Acconto 50% per ordine\nSaldo 50% alla consegna",
        depositPercent: 50, depositCents: 381500, balancePercent: 50, balanceCents: 381500, incentive: "Detrazione 50%",
        incentivePercent: 50, incentiveAmountCents: 381500, netAfterIncentiveCents: 381500,
        fiscalNote: "*L’IVA calcolata rientra nell’agevolazione per beni significativi Articolo 7, comma 1, lettera b, della Legge 488/1999",
        visibleNotes: "È possibile richiesta di finanziamento totale o parziale.\nAll’accettazione del preventivo sarà necessario un sopralluogo da parte degli installatori per valutare l’effettiva realizzazione dell’opera.\nAccensioni con attivazione garanzia Samsung inclusa nel prezzo.",
        subtotalCents: 625410, vatCents: 137590, totalCents: 763000, estimatedMarginCents: 165410, issuedAt: quoteDate,
        statusHistory: { create: { toStatus: "EMESSO", note: "Preventivo dimostrativo iniziale", changedAt: quoteDate } },
        reminders: { create: { dueAt: calculateExpiryDate(quoteDate, 25) } }
      } });
      await tx.quoteItem.createMany({ data: itemData.map((item) => ({ ...item, quoteId: quote.id })) });
    });
  }

  await prisma.appSetting.upsert({ where: { key: "seedVersion" }, update: { value: "1" }, create: { key: "seedVersion", value: "1" } });
  console.log("Dati iniziali inseriti senza cancellare i record esistenti.");
}

seed().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

export { CONDITIONS, PRIVACY };
