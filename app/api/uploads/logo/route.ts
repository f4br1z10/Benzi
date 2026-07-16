import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/prisma";
import { ensureStorageDirectories, safeStoragePath, uniqueStoredName, workspaceRoot } from "@/lib/files";
import { handleApiError, jsonError } from "@/lib/http";
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) return jsonError("Seleziona un'immagine.");
    if (!(["image/png", "image/jpeg", "image/webp"]).includes(file.type)) return jsonError("Formato logo non supportato.");
    const maxMb = (await prisma.companySettings.findUnique({ where: { id: 1 } }))?.maxUploadMb || 20;
    if (file.size > maxMb * 1024 * 1024) return jsonError(`Il file supera il limite di ${maxMb} MB.`);
    await ensureStorageDirectories(); const storedName = uniqueStoredName(file.name); const target = safeStoragePath("logos", storedName);
    await fs.writeFile(target, Buffer.from(await file.arrayBuffer())); const relative = path.relative(workspaceRoot, target).replaceAll("\\", "/");
    await prisma.companySettings.update({ where: { id: 1 }, data: { logoPath: relative } });
    return NextResponse.json({ path: relative });
  } catch (error) { return handleApiError(error, "caricamento logo"); }
}
