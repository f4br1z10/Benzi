import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import { createBackup } from "@/server/backup";
import { prisma } from "@/server/prisma";
import { ensureStorageDirectories, storageRoot, uniqueStoredName } from "@/lib/files";
import { handleApiError, jsonError } from "@/lib/http";

export async function GET() { try { const target = await createBackup(); const bytes = await fs.readFile(target); return new NextResponse(bytes, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${path.basename(target)}"` } }); } catch (error) { return handleApiError(error, "esportazione backup"); } }
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) return jsonError("Seleziona un archivio ZIP.");
    if (!file.name.toLowerCase().endsWith(".zip")) return jsonError("Il backup deve essere un archivio ZIP."); await ensureStorageDirectories();
    const temp = path.join(storageRoot, "imports", uniqueStoredName(file.name)); await fs.writeFile(temp, Buffer.from(await file.arrayBuffer()));
    const zip = new AdmZip(temp); const entries = zip.getEntries(); const names = entries.map((e) => e.entryName.replaceAll("\\", "/"));
    if (!names.includes("manifest.json") || !names.includes("database/sg-clima.db")) return jsonError("Archivio non riconosciuto: manifest o database assente.");
    if (names.some((name) => name.includes("..") || path.isAbsolute(name))) return jsonError("Archivio non sicuro.");
    await createBackup(); await prisma.$disconnect();
    const dbEntry = zip.getEntry("database/sg-clima.db"); if (!dbEntry) return jsonError("Database assente.");
    await fs.writeFile(path.join(storageRoot, "sg-clima.db"), dbEntry.getData());
    for (const entry of entries.filter((e) => e.entryName.startsWith("storage/") && !e.isDirectory)) {
      const relative = entry.entryName.slice("storage/".length); const target = path.resolve(storageRoot, relative);
      if (!target.startsWith(storageRoot + path.sep)) continue; await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, entry.getData());
    }
    await fs.unlink(temp).catch(() => undefined); return NextResponse.json({ restored: true, message: "Backup ripristinato. Riavvia l’applicazione." });
  } catch (error) { return handleApiError(error, "ripristino backup"); }
}
