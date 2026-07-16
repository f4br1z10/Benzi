import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { createQuote, refreshExpiredQuotes } from "@/server/quotes";
import { handleApiError } from "@/lib/http";

export async function GET(request: NextRequest) {
  await refreshExpiredQuotes();
  const p = request.nextUrl.searchParams; const q = p.get("q")?.trim(); const status = p.get("status") || undefined;
  const categoryId = Number(p.get("categoryId")) || undefined; const city = p.get("city")?.trim();
  const from = p.get("from") ? new Date(`${p.get("from")}T00:00:00`) : undefined; const to = p.get("to") ? new Date(`${p.get("to")}T23:59:59`) : undefined;
  return NextResponse.json(await prisma.quote.findMany({ where: {
    ...(status ? { status } : {}), ...(categoryId ? { categoryId } : {}), ...(from || to ? { quoteDate: { gte: from, lte: to } } : {}),
    ...(city ? { customer: { addresses: { some: { city: { contains: city } } } } } : {}),
    ...(q ? { OR: [{ number: { contains: q } }, { subject: { contains: q } }, { customer: { firstName: { contains: q } } }, { customer: { lastName: { contains: q } } }, { customer: { companyName: { contains: q } } }, { items: { some: { description: { contains: q } } } }] } : {})
  }, include: { customer: true, category: true, items: true }, orderBy: { updatedAt: "desc" } }));
}
export async function POST(request: NextRequest) { try { return NextResponse.json(await createQuote(await request.json()), { status: 201 }); } catch (error) { return handleApiError(error, "creazione preventivo"); } }
