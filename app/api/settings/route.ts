import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { handleApiError } from "@/lib/http";

const schema = z.object({
  businessName: z.string().min(1), vatNumber: z.string().nullable().optional(), taxCode: z.string().nullable().optional(),
  address: z.string().nullable().optional(), streetNumber: z.string().nullable().optional(), postalCode: z.string().nullable().optional(),
  city: z.string().nullable().optional(), province: z.string().nullable().optional(), phone: z.string().nullable().optional(),
  email: z.union([z.string().email(), z.literal(""), z.null()]).optional(), pec: z.string().nullable().optional(), openingHours: z.string().nullable().optional(),
  logoPath: z.string().nullable().optional(), defaultSeller: z.string().nullable().optional(), defaultValidityDays: z.coerce.number().int().min(1).max(365),
  defaultDeliveryTime: z.string().nullable().optional(), defaultPaymentMethodId: z.coerce.number().int().positive().nullable().optional(),
  defaultPaymentConditions: z.string().nullable().optional(), defaultVatRate: z.coerce.number().min(0).max(100),
  defaultTaxNote: z.string().nullable().optional(), standardNotes: z.string().nullable().optional(), quoteNumberFormat: z.string().min(3),
  depositThresholdCents: z.coerce.number().int().min(0), defaultDepositPercent: z.coerce.number().min(0).max(100), maxUploadMb: z.coerce.number().int().min(1).max(100),
  conditionsContent: z.string().min(1), privacyContent: z.string().min(1)
});

export async function GET() {
  const [settings, legalDocuments, paymentMethods] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: 1 } }), prisma.legalDocument.findMany(), prisma.paymentMethod.findMany({ orderBy: { position: "asc" } })
  ]);
  return NextResponse.json({ settings, legalDocuments, paymentMethods });
}
export async function PUT(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    const { conditionsContent, privacyContent, ...settings } = input;
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.companySettings.upsert({ where: { id: 1 }, update: settings, create: { id: 1, ...settings } });
      await tx.legalDocument.upsert({ where: { type: "CONDIZIONI" }, update: { content: conditionsContent }, create: { type: "CONDIZIONI", title: "Note tecniche e condizioni di fornitura beni e servizi", content: conditionsContent } });
      await tx.legalDocument.upsert({ where: { type: "PRIVACY" }, update: { content: privacyContent }, create: { type: "PRIVACY", title: "Informativa privacy", content: privacyContent } });
      return company;
    });
    return NextResponse.json(result);
  } catch (error) { return handleApiError(error, "salvataggio impostazioni"); }
}
