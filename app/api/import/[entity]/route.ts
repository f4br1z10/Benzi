import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/server/prisma";
import { customerSchema, productSchema } from "@/lib/validators";
import { handleApiError, jsonError } from "@/lib/http";
type Context = { params: Promise<{ entity: string }> };
const bool = (value: unknown, fallback = false) => value === true || String(value).toLowerCase() === "true" || (value === undefined ? fallback : false);
const num = (value: unknown, fallback = 0) => Number(value) || fallback;
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const entity = (await params).entity; if (!(["customers", "products"]).includes(entity)) return jsonError("Importazione non supportata.", 404);
    const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) return jsonError("Seleziona un CSV.");
    if (file.size > 10 * 1024 * 1024) return jsonError("Il CSV supera 10 MB.");
    const result = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true, delimiter: "" });
    if (result.errors.length) return jsonError("CSV non valido.", 422, result.errors.slice(0, 10));
    const errors: { row: number; message: string }[] = []; let imported = 0;
    for (const [index, row] of result.data.entries()) {
      try {
        if (entity === "customers") {
          let addresses = []; try { addresses = row.addresses ? JSON.parse(row.addresses) : []; } catch { addresses = []; }
          const input = customerSchema.parse({ ...row, archived: bool(row.archived), allowDuplicate: true, addresses }); const { addresses: list, allowDuplicate: _, ...data } = input;
          await prisma.customer.create({ data: { ...data, addresses: { create: list } } });
        } else {
          const input = productSchema.parse({ ...row, categoryId: num(row.categoryId), salePriceInclVatCents: num(row.salePriceInclVatCents), salePriceExclVatCents: num(row.salePriceExclVatCents), purchaseCostCents: num(row.purchaseCostCents), vatRate: num(row.vatRate, 22), active: bool(row.active, true) });
          await prisma.product.upsert({ where: { internalCode: input.internalCode }, update: input, create: input });
        }
        imported += 1;
      } catch (error) { errors.push({ row: index + 2, message: error instanceof Error ? error.message : "Riga non valida" }); }
    }
    return NextResponse.json({ imported, errors });
  } catch (error) { return handleApiError(error, "importazione CSV"); }
}
