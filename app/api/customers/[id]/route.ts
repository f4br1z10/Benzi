import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { customerSchema } from "@/lib/validators";
import { handleApiError, jsonError } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Context) {
  const id = Number((await params).id);
  const customer = await prisma.customer.findUnique({ where: { id }, include: { addresses: true, quotes: { orderBy: { quoteDate: "desc" } } } });
  return customer ? NextResponse.json(customer) : jsonError("Cliente non trovato.", 404);
}

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const id = Number((await params).id);
    const input = customerSchema.parse(await request.json());
    if (!input.allowDuplicate && (input.taxCode || input.vatNumber)) {
      const duplicate = await prisma.customer.findFirst({ where: { id: { not: id }, OR: [
        ...(input.taxCode ? [{ taxCode: input.taxCode }] : []), ...(input.vatNumber ? [{ vatNumber: input.vatNumber }] : [])
      ] } });
      if (duplicate) return jsonError("Duplicato anagrafico rilevato. Conferma per salvare comunque.", 409, { duplicateId: duplicate.id, requiresConfirmation: true });
    }
    const { addresses, allowDuplicate: _, ...data } = input;
    const customer = await prisma.$transaction(async (tx) => {
      await tx.customerAddress.deleteMany({ where: { customerId: id } });
      return tx.customer.update({ where: { id }, data: { ...data, addresses: { create: addresses } }, include: { addresses: true } });
    });
    return NextResponse.json(customer);
  } catch (error) { return handleApiError(error, "modifica cliente"); }
}

export async function DELETE(_: NextRequest, { params }: Context) {
  try {
    const id = Number((await params).id);
    const quoteCount = await prisma.quote.count({ where: { customerId: id } });
    if (quoteCount) {
      const customer = await prisma.customer.update({ where: { id }, data: { archived: true } });
      return NextResponse.json({ archived: true, customer, message: "Cliente archiviato perché collegato a preventivi." });
    }
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) { return handleApiError(error, "eliminazione cliente"); }
}
