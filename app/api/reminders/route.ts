import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { refreshExpiredQuotes } from "@/server/quotes";
export async function GET() { await refreshExpiredQuotes(); return NextResponse.json(await prisma.quoteReminder.findMany({ where: { OR: [{ contactedAt: null }, { postponedUntil: { not: null } }] }, include: { quote: { include: { customer: true } } }, orderBy: { dueAt: "asc" } })); }
export async function PATCH(request: NextRequest) { const body = await request.json(); const id = Number(body.id); const data = body.action === "contacted" ? { contactedAt: new Date(), contactNotes: String(body.notes || "") } : { postponedUntil: new Date(body.postponedUntil), dueAt: new Date(body.postponedUntil), contactNotes: String(body.notes || "") }; return NextResponse.json(await prisma.quoteReminder.update({ where: { id }, data })); }
