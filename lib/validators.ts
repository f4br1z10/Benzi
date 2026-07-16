import { z } from "zod";
import { QUOTE_ITEM_TYPES, QUOTE_STATUSES } from "@/lib/constants";

const optionalText = z.string().trim().max(5000).optional().nullable();

export const addressSchema = z.object({
  type: z.enum(["RESIDENZA", "INSTALLAZIONE"]).default("RESIDENZA"),
  address: optionalText,
  streetNumber: optionalText,
  postalCode: optionalText,
  city: optionalText,
  province: optionalText,
  isDefault: z.boolean().default(false),
});

export const customerSchema = z
  .object({
    type: z.enum(["PRIVATO", "AZIENDA"]).default("PRIVATO"),
    firstName: optionalText,
    lastName: optionalText,
    companyName: optionalText,
    taxCode: optionalText,
    vatNumber: optionalText,
    recipientCode: optionalText,
    pec: optionalText,
    phone: optionalText,
    email: z
      .union([z.string().email("E-mail non valida"), z.literal(""), z.null()])
      .optional(),
    notes: optionalText,
    archived: z.boolean().default(false),
    allowDuplicate: z.boolean().optional(),
    addresses: z.array(addressSchema).max(4).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.type === "PRIVATO" && !value.firstName && !value.lastName)
      ctx.addIssue({
        code: "custom",
        message: "Inserisci nome o cognome",
        path: ["firstName"],
      });
    if (value.type === "AZIENDA" && !value.companyName)
      ctx.addIssue({
        code: "custom",
        message: "Inserisci la ragione sociale",
        path: ["companyName"],
      });
  });

export const productSchema = z.object({
  internalCode: z.string().trim().min(1, "Codice obbligatorio").max(50),
  name: z.string().trim().min(1, "Nome obbligatorio").max(250),
  categoryId: z.coerce.number().int().positive(),
  subcategory: optionalText,
  brand: optionalText,
  model: optionalText,
  description: optionalText,
  power: optionalText,
  capacity: optionalText,
  unit: z.string().trim().default("pz"),
  salePriceInclVatCents: z.coerce.number().int().min(0).default(0),
  salePriceExclVatCents: z.coerce.number().int().min(0).default(0),
  vatRate: z.coerce.number().min(0).max(100).default(22),
  purchaseCostCents: z.coerce.number().int().min(0).default(0),
  supplier: optionalText,
  internalNotes: optionalText,
  quoteDescription: optionalText,
  technicalConfiguration: optionalText,
  active: z.boolean().default(true),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(1).max(250),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  description: optionalText,
  defaultPriceCents: z.coerce.number().int().min(0).default(0),
  vatRate: z.coerce.number().min(0).max(100).default(22),
  unit: z.string().trim().default("corpo"),
  estimatedDuration: optionalText,
  active: z.boolean().default(true),
});

export const quoteItemSchema = z.object({
  type: z.enum(QUOTE_ITEM_TYPES).default("LIBERA"),
  productId: z.coerce.number().int().positive().optional().nullable(),
  serviceId: z.coerce.number().int().positive().optional().nullable(),
  position: z.coerce.number().int().min(0),
  title: optionalText,
  description: z.string().max(10000).default(""),
  quantity: z.coerce.number().min(0).default(1),
  unit: z.string().max(30).default("pz"),
  unitPriceCents: z.coerce.number().int().min(0).default(0),
  priceIncludesVat: z.boolean().default(true),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  discountFixedCents: z.coerce.number().int().min(0).default(0),
  vatRate: z.coerce.number().min(0).max(100).default(22),
  purchaseCostCents: z.coerce.number().int().min(0).default(0),
  configurationSnapshot: optionalText,
});

export const quoteSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(QUOTE_STATUSES).default("BOZZA"),
  quoteDate: z.coerce.date(),
  validityDays: z.coerce.number().int().min(1).max(365).default(30),
  seller: optionalText,
  subject: optionalText,
  deliveryTime: optionalText,
  internalNotes: optionalText,
  installationAddressSnapshot: optionalText,
  technicalConfiguration: optionalText,
  paymentMethod: optionalText,
  paymentConditions: optionalText,
  depositPercent: z.coerce.number().min(0).max(100).default(0),
  financingAvailable: z.boolean().default(false),
  financingType: optionalText,
  financingNotes: optionalText,
  incentive: optionalText,
  fiscalNote: optionalText,
  visibleNotes: optionalText,
  additionalConditions: optionalText,
  attachmentMode: z
    .enum(["NESSUNO", "TUTTE", "SELEZIONATE"])
    .default("NESSUNO"),
  selectedAttachmentIds: z.array(z.coerce.number().int().positive()).default([]),
  items: z.array(quoteItemSchema).min(1, "Inserisci almeno una riga"),
});

export const statusChangeSchema = z.object({
  status: z.enum(QUOTE_STATUSES),
  note: optionalText,
});
