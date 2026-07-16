import { NextRequest, NextResponse } from "next/server";
import { statusChangeSchema } from "@/lib/validators";
import { changeQuoteStatus } from "@/server/quotes";
import { handleApiError } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, { params }: Context) { try { const input = statusChangeSchema.parse(await request.json()); return NextResponse.json(await changeQuoteStatus(Number((await params).id), input.status, input.note)); } catch (error) { return handleApiError(error, "cambio stato preventivo"); } }
