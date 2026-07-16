import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { prisma } from "@/server/prisma";
import { ensureStorageDirectories, safeStoragePath, uniqueStoredName } from "@/lib/files";
import { handleApiError, jsonError } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const productId = Number((await params).id); const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Seleziona un PDF."); if (file.type !== "application/pdf") return jsonError("Sono accettati soltanto file PDF.");
    const maxMb = (await prisma.companySettings.findUnique({ where: { id: 1 } }))?.maxUploadMb || 20;
    if (file.size > maxMb * 1024 * 1024) return jsonError(`Il file supera il limite di ${maxMb} MB.`);
    const bytes = Buffer.from(await file.arrayBuffer()); if (bytes.subarray(0, 5).toString() !== "%PDF-") return jsonError("Il contenuto non è un PDF valido.");
    await ensureStorageDirectories(); const storedName = uniqueStoredName(file.name); const target = safeStoragePath("product-attachments", storedName); await fs.writeFile(target, bytes);
    return NextResponse.json(await prisma.productAttachment.create({ data: { productId, originalName: file.name, storedName, path: target, sizeBytes: file.size } }), { status: 201 });
  } catch (error) { return handleApiError(error, "caricamento scheda tecnica"); }
}
