import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { serviceSchema } from "@/lib/validators";
import { handleApiError } from "@/lib/http";
export async function GET(request: NextRequest) { const q = request.nextUrl.searchParams.get("q")?.trim(); return NextResponse.json(await prisma.service.findMany({ where: q ? { OR: [{ name: { contains: q } }, { description: { contains: q } }] } : {}, include: { category: true }, orderBy: { updatedAt: "desc" } })); }
export async function POST(request: NextRequest) { try { return NextResponse.json(await prisma.service.create({ data: serviceSchema.parse(await request.json()), include: { category: true } }), { status: 201 }); } catch (error) { return handleApiError(error, "creazione servizio"); } }
