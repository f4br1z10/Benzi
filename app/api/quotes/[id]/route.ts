import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { prisma } from "@/server/prisma";
import { updateQuote } from "@/server/quotes";
import { handleApiError, jsonError } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: NextRequest, { params }: Context) { const quote = await prisma.quote.findUnique({ where: { id: Number((await params).id) }, include: { customer: { include: { addresses: true } }, category: true, items: { orderBy: { position: "asc" } }, statusHistory: { orderBy: { changedAt: "desc" } }, reminders: true, attachmentSelections: { include: { attachment: true } } } }); return quote ? NextResponse.json(quote) : jsonError("Preventivo non trovato.", 404); }
export async function PUT(request: NextRequest, { params }: Context) { try { return NextResponse.json(await updateQuote(Number((await params).id), await request.json())); } catch (error) { return handleApiError(error, "modifica preventivo"); } }
export async function DELETE(_: NextRequest, { params }: Context) { try { const id = Number((await params).id); const quote = await prisma.quote.findUnique({ where: { id } }); await prisma.quote.delete({ where: { id } }); if (quote?.lastPdfPath) await fs.unlink(quote.lastPdfPath).catch(() => undefined); return NextResponse.json({ deleted: true }); } catch (error) { return handleApiError(error, "eliminazione preventivo"); } }
