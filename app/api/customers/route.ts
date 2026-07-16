import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { customerSchema } from "@/lib/validators";
import { handleApiError, jsonError } from "@/lib/http";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const city = request.nextUrl.searchParams.get("city")?.trim();
  const archived = request.nextUrl.searchParams.get("archived") === "true";
  const customers = await prisma.customer.findMany({
    where: {
      archived,
      ...(city ? { addresses: { some: { city: { contains: city } } } } : {}),
      ...(query ? { OR: [
        { firstName: { contains: query } }, { lastName: { contains: query } }, { companyName: { contains: query } },
        { phone: { contains: query } }, { email: { contains: query } }, { taxCode: { contains: query } }, { vatNumber: { contains: query } }
      ] } : {})
    }, include: { addresses: true, _count: { select: { quotes: true } } }, orderBy: [{ updatedAt: "desc" }]
  });
  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  try {
    const input = customerSchema.parse(await request.json());
    if (!input.allowDuplicate && (input.taxCode || input.vatNumber)) {
      const duplicate = await prisma.customer.findFirst({ where: { OR: [
        ...(input.taxCode ? [{ taxCode: input.taxCode }] : []), ...(input.vatNumber ? [{ vatNumber: input.vatNumber }] : [])
      ] } });
      if (duplicate) return jsonError("Esiste già un cliente con lo stesso codice fiscale o partita IVA. Conferma per salvare comunque.", 409, { duplicateId: duplicate.id, requiresConfirmation: true });
    }
    const { addresses, allowDuplicate: _, ...data } = input;
    const customer = await prisma.customer.create({ data: { ...data, addresses: { create: addresses } }, include: { addresses: true } });
    return NextResponse.json(customer, { status: 201 });
  } catch (error) { return handleApiError(error, "creazione cliente"); }
}
