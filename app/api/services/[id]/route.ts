import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { serviceSchema } from "@/lib/validators";
import { handleApiError } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function PUT(request: NextRequest, { params }: Context) { try { return NextResponse.json(await prisma.service.update({ where: { id: Number((await params).id) }, data: serviceSchema.parse(await request.json()), include: { category: true } })); } catch (error) { return handleApiError(error, "modifica servizio"); } }
export async function DELETE(_: NextRequest, { params }: Context) { try { const id = Number((await params).id); const count = await prisma.quoteItem.count({ where: { serviceId: id } }); if (count) return NextResponse.json({ archived: true, service: await prisma.service.update({ where: { id }, data: { active: false } }) }); await prisma.service.delete({ where: { id } }); return NextResponse.json({ deleted: true }); } catch (error) { return handleApiError(error, "eliminazione servizio"); } }
