import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { productSchema } from "@/lib/validators";
import { handleApiError } from "@/lib/http";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const categoryId = Number(request.nextUrl.searchParams.get("categoryId")) || undefined;
  return NextResponse.json(await prisma.product.findMany({ where: {
    ...(categoryId ? { categoryId } : {}), ...(q ? { OR: [{ name: { contains: q } }, { internalCode: { contains: q } }, { brand: { contains: q } }, { model: { contains: q } }] } : {})
  }, include: { category: true, attachments: true }, orderBy: { updatedAt: "desc" } }));
}
export async function POST(request: NextRequest) {
  try { return NextResponse.json(await prisma.product.create({ data: productSchema.parse(await request.json()), include: { category: true, attachments: true } }), { status: 201 }); }
  catch (error) { return handleApiError(error, "creazione prodotto"); }
}
