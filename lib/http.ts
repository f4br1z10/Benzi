import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { appendErrorLog } from "@/lib/files";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function handleApiError(error: unknown, context: string) {
  await appendErrorLog(context, error).catch(() => undefined);
  if (error instanceof ZodError) return jsonError("Controlla i dati inseriti.", 422, error.flatten());
  if (error instanceof Error && error.message.includes("Unique constraint")) return jsonError("Esiste già un record con questi dati.", 409);
  return jsonError(error instanceof Error ? error.message : "Si è verificato un errore imprevisto.", 500);
}
