export const QUOTE_STATUSES = [
  "BOZZA", "EMESSO", "INVIATO", "ACCETTATO", "RIFIUTATO", "SCADUTO", "ANNULLATO"
] as const;

export const STATUS_LABELS: Record<string, string> = {
  BOZZA: "Bozza",
  EMESSO: "Emesso",
  INVIATO: "Inviato",
  ACCETTATO: "Accettato",
  RIFIUTATO: "Rifiutato",
  SCADUTO: "Scaduto",
  ANNULLATO: "Annullato"
};

export const QUOTE_ITEM_TYPES = ["PRODOTTO", "SERVIZIO", "LIBERA", "TITOLO", "TESTO"] as const;

export const INITIAL_CATEGORIES = [
  "Efficientamento energetico", "Fotovoltaico", "Pompa di calore",
  "Climatizzatore", "Caldaia a gas", "Wallbox", "Impiantistica",
  "Multiprodotto"
];

export const TECHNICAL_CATEGORY_FIELDS: Record<string, { key: string; label: string; type?: string; options?: string[] }[]> = {
  climatizzatore: [
    { key: "tipologia", label: "Tipologia", options: ["Monosplit", "Dual Split", "Trial Split", "Quadri Split", "Penta Split"] },
    { key: "unitaEsterna", label: "Unità esterna" }, { key: "unitaInterne", label: "Unità interne" },
    { key: "marca", label: "Marca" }, { key: "modello", label: "Modello" }, { key: "potenza", label: "Potenza" },
    { key: "btu", label: "BTU" }, { key: "opereAccessori", label: "Opere e accessori", type: "textarea" }
  ],
  "caldaia-a-gas": [
    { key: "marca", label: "Marca" }, { key: "modello", label: "Modello" }, { key: "potenza", label: "Potenza" },
    { key: "tipoCaldaia", label: "Tipo caldaia" }, { key: "defangatore", label: "Defangatore magnetico", type: "checkbox" },
    { key: "filtroAnticalcare", label: "Filtro anticalcare", type: "checkbox" }, { key: "connessioniIdrauliche", label: "Connessioni idrauliche", type: "checkbox" },
    { key: "scaricoFumi", label: "Scarico fumi standard", type: "checkbox" }, { key: "intubamentoMetri", label: "Metri intubamento" },
    { key: "prezzoMetro", label: "Prezzo per metro" }, { key: "lavaggioImpianto", label: "Lavaggio impianto", type: "checkbox" },
    { key: "termostato", label: "Termostato (marca e modello)" }, { key: "termovalvole", label: "Quantità termovalvole" }, { key: "note", label: "Note", type: "textarea" }
  ],
  fotovoltaico: [
    { key: "marcaModuli", label: "Marca moduli" }, { key: "modelloModuli", label: "Modello moduli" }, { key: "potenzaModulo", label: "Potenza singolo modulo" },
    { key: "quantitaModuli", label: "Quantità moduli" }, { key: "potenzaTotale", label: "Potenza totale" }, { key: "struttura", label: "Tipo struttura" },
    { key: "inverter", label: "Marca e modello inverter" }, { key: "potenzaInverter", label: "Potenza inverter" }, { key: "quadro", label: "Quadro elettrico" },
    { key: "cablaggioDC", label: "Cablaggio DC" }, { key: "cablaggioAC", label: "Cablaggio AC" }, { key: "batterie", label: "Batterie di accumulo", type: "checkbox" },
    { key: "dettaglioBatterie", label: "Marca, modello, capacità e quantità batterie" }, { key: "backup", label: "Backup impianto", type: "checkbox" },
    { key: "trasporto", label: "Trasporto a tetto", options: ["Braccio meccanico", "Drone da trasporto", "Piattaforma aerea", "Nessuna attrezzatura speciale", "Altro"] }
  ],
  "pompa-di-calore": [
    { key: "marca", label: "Marca" }, { key: "modello", label: "Modello" }, { key: "potenza", label: "Potenza" }, { key: "tipologia", label: "Tipologia" },
    { key: "unitaEsterna", label: "Unità esterna" }, { key: "acs", label: "Produzione acqua calda sanitaria", type: "checkbox" },
    { key: "split", label: "Split" }, { key: "accumulo", label: "Capacità accumulo" }, { key: "accessori", label: "Accessori", type: "textarea" },
    { key: "opereIncluse", label: "Opere incluse", type: "textarea" }, { key: "note", label: "Note tecniche", type: "textarea" }
  ],
  "solare-termico": [
    { key: "marca", label: "Marca" }, { key: "modello", label: "Modello" }, { key: "capacita", label: "Capacità" },
    { key: "pannelli", label: "Quantità pannelli" }, { key: "tipologia", label: "Tipologia" }, { key: "accumulo", label: "Accumulo" },
    { key: "accessori", label: "Accessori", type: "textarea" }, { key: "opereIncluse", label: "Opere incluse", type: "textarea" }, { key: "note", label: "Note tecniche", type: "textarea" }
  ],
  wallbox: [
    { key: "marca", label: "Marca" }, { key: "modello", label: "Modello" }, { key: "potenza", label: "Potenza" },
    { key: "fase", label: "Alimentazione", options: ["Monofase", "Trifase"] }, { key: "smartMeter", label: "Smart meter", type: "checkbox" },
    { key: "palo", label: "Palo di supporto", type: "checkbox" }, { key: "cavo", label: "Lunghezza cavo" },
    { key: "protezioni", label: "Protezioni elettriche" }, { key: "opereIncluse", label: "Opere incluse", type: "textarea" }, { key: "note", label: "Note tecniche", type: "textarea" }
  ]
};
