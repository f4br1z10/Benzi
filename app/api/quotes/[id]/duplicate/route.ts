import { NextRequest, NextResponse } from "next/server";
import { duplicateQuote } from "@/server/quotes";
import { handleApiError } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function POST(_: NextRequest, { params }: Context) { try { return NextResponse.json(await duplicateQuote(Number((await params).id)), { status: 201 }); } catch (error) { return handleApiError(error, "duplicazione preventivo"); } }
