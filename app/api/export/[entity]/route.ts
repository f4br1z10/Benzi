import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/server/prisma";
import { jsonError } from "@/lib/http";
type Context = { params: Promise<{ entity: string }> };
export async function GET(_: NextRequest, { params }: Context) {
  const entity = (await params).entity; let data: Record<string, unknown>[];
  if (entity === "customers") data = await prisma.customer.findMany({ include: { addresses: true } }) as unknown as Record<string, unknown>[];
  else if (entity === "products") data = await prisma.product.findMany({ include: { category: true } }) as unknown as Record<string, unknown>[];
  else if (entity === "quotes") data = await prisma.quote.findMany({ include: { customer: true, category: true } }) as unknown as Record<string, unknown>[];
  else return jsonError("Esportazione non supportata.", 404);
  const flattened = data.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "object" && value !== null ? JSON.stringify(value) : value])));
  const csv = Papa.unparse(flattened, { delimiter: ";" }); return new NextResponse(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${entity}-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
