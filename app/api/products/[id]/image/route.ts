import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/prisma";
import { ensureStorageDirectories, safeStoragePath, uniqueStoredName } from "@/lib/files";
import { handleApiError, jsonError } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };
const mimeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
};

export async function GET(_: NextRequest, { params }: Context) {
  const product = await prisma.product.findUnique({ where: { id: Number((await params).id) }, select: { imagePath: true } });
  if (!product?.imagePath) return jsonError("Immagine non disponibile.", 404);
  try {
    const bytes = await fs.readFile(product.imagePath);
    return new NextResponse(bytes, { headers: { "Content-Type": mimeByExtension[path.extname(product.imagePath).toLowerCase()] || "application/octet-stream", "Cache-Control": "private, max-age=3600" } });
  } catch { return jsonError("Immagine non disponibile.", 404); }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const productId = Number((await params).id);
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return jsonError("Prodotto non trovato.", 404);
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File)) return jsonError("Seleziona un’immagine.");
    if (!Object.values(mimeByExtension).includes(file.type)) return jsonError("Sono accettate immagini JPG, PNG o WebP.");
    if (file.size > 10 * 1024 * 1024) return jsonError("L’immagine supera 10 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isWebp = bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
    if (!isPng && !isJpeg && !isWebp) return jsonError("Il contenuto non è un’immagine valida.");
    await ensureStorageDirectories();
    const target = safeStoragePath("product-images", uniqueStoredName(file.name));
    await fs.writeFile(target, bytes);
    const updated = await prisma.product.update({ where: { id: productId }, data: { imagePath: target }, include: { category: true, attachments: true } });
    if (product.imagePath && product.imagePath !== target) await fs.unlink(product.imagePath).catch(() => undefined);
    return NextResponse.json(updated);
  } catch (error) { return handleApiError(error, "caricamento immagine prodotto"); }
}

export async function DELETE(_: NextRequest, { params }: Context) {
  try {
    const id = Number((await params).id); const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return jsonError("Prodotto non trovato.", 404);
    await prisma.product.update({ where: { id }, data: { imagePath: null } });
    if (product.imagePath) await fs.unlink(product.imagePath).catch(() => undefined);
    return NextResponse.json({ deleted: true });
  } catch (error) { return handleApiError(error, "eliminazione immagine prodotto"); }
}
