import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { slugify } from "@/lib/format";
import { handleApiError } from "@/lib/http";

const schema = z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(1).max(100), position: z.number().int().min(0).default(0), active: z.boolean().default(true) });

export async function GET() {
  return NextResponse.json(await prisma.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] }));
}
export async function POST(request: NextRequest) {
  try { const input = schema.parse(await request.json()); return NextResponse.json(await prisma.category.create({ data: { name: input.name, slug: slugify(input.name), position: input.position, active: input.active } }), { status: 201 }); }
  catch (error) { return handleApiError(error, "creazione categoria"); }
}
export async function PUT(request: NextRequest) {
  try { const input = schema.extend({ id: z.number().int().positive() }).parse(await request.json()); return NextResponse.json(await prisma.category.update({ where: { id: input.id }, data: { name: input.name, slug: slugify(input.name), position: input.position, active: input.active } })); }
  catch (error) { return handleApiError(error, "modifica categoria"); }
}
