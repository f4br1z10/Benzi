import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { prisma } from "@/server/prisma";
import { handleApiError, jsonError } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: NextRequest, { params }: Context) { const attachment = await prisma.productAttachment.findUnique({ where: { id: Number((await params).id) } }); if (!attachment) return jsonError("Allegato non trovato.", 404); try { const bytes = await fs.readFile(attachment.path); return new NextResponse(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.originalName)}"` } }); } catch { return jsonError("File non disponibile.", 404); } }
export async function DELETE(_: NextRequest, { params }: Context) { try { const id = Number((await params).id); const attachment = await prisma.productAttachment.delete({ where: { id } }); await fs.unlink(attachment.path).catch(() => undefined); return NextResponse.json({ deleted: true }); } catch (error) { return handleApiError(error, "eliminazione allegato"); } }
