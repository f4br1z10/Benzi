import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { prisma } from "@/server/prisma";
import { productSchema } from "@/lib/validators";
import { handleApiError, jsonError } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: NextRequest, { params }: Context) { const product = await prisma.product.findUnique({ where: { id: Number((await params).id) }, include: { category: true, attachments: true } }); return product ? NextResponse.json(product) : jsonError("Prodotto non trovato.", 404); }
export async function PUT(request: NextRequest, { params }: Context) { try { return NextResponse.json(await prisma.product.update({ where: { id: Number((await params).id) }, data: productSchema.parse(await request.json()), include: { category: true, attachments: true } })); } catch (error) { return handleApiError(error, "modifica prodotto"); } }
export async function DELETE(_: NextRequest, { params }: Context) { try { const id = Number((await params).id); const itemCount = await prisma.quoteItem.count({ where: { productId: id } }); if (itemCount) { const product = await prisma.product.update({ where: { id }, data: { active: false } }); return NextResponse.json({ archived: true, product }); } const product = await prisma.product.findUnique({ where: { id }, include: { attachments: true } }); await prisma.product.delete({ where: { id } }); await Promise.all([...(product?.attachments.map((a) => fs.unlink(a.path).catch(() => undefined)) || []),...(product?.imagePath?[fs.unlink(product.imagePath).catch(() => undefined)]:[])]); return NextResponse.json({ deleted: true }); } catch (error) { return handleApiError(error, "eliminazione prodotto"); } }
