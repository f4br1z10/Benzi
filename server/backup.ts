import fs from "node:fs/promises";
import path from "node:path";
import archiver from "archiver";
import { createWriteStream } from "node:fs";
import { prisma } from "@/server/prisma";
import { ensureStorageDirectories, storageRoot } from "@/lib/files";

export async function createBackup(destination?: string) {
  await ensureStorageDirectories();
  await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(FULL)").catch(() => undefined);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = destination || path.join(storageRoot, "backups", `backup-sg-clima-${stamp}.zip`);
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(target); const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve); output.on("error", reject); archive.on("error", reject); archive.pipe(output);
    archive.file(path.join(storageRoot, "sg-clima.db"), { name: "database/sg-clima.db" });
    for (const directory of ["logos", "product-attachments", "product-images"]) archive.directory(path.join(storageRoot, directory), `storage/${directory}`);
    archive.append(JSON.stringify({ application: "SG Clima - Gestione preventivi", version: 1, createdAt: new Date().toISOString() }, null, 2), { name: "manifest.json" });
    archive.finalize();
  });
  return target;
}
