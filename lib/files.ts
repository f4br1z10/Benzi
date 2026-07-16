import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

export const workspaceRoot = process.cwd();
export const storageRoot = path.resolve(workspaceRoot, "storage");

export const storageDirectories = [
  "logos", "product-attachments", "product-images", "generated-quotes", "backups", "logs", "imports"
];

export async function ensureStorageDirectories() {
  await Promise.all(storageDirectories.map((directory) => fs.mkdir(path.join(storageRoot, directory), { recursive: true })));
  await fs.mkdir(path.resolve(workspaceRoot, "output", "pdf"), { recursive: true });
}

export function sanitizeFilename(filename: string, fallback = "file") {
  const extension = path.extname(filename).toLowerCase().replace(/[^.a-z0-9]/g, "");
  const base = path.basename(filename, path.extname(filename))
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || fallback;
  return `${base}${extension}`;
}

export function uniqueStoredName(originalName: string) {
  const safe = sanitizeFilename(originalName);
  return `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safe}`;
}

export function safeStoragePath(subdirectory: string, filename: string) {
  if (!storageDirectories.includes(subdirectory)) throw new Error("Cartella di archiviazione non consentita.");
  const base = path.resolve(storageRoot, subdirectory);
  const resolved = path.resolve(base, sanitizeFilename(filename));
  if (!resolved.startsWith(`${base}${path.sep}`)) throw new Error("Percorso file non valido.");
  return resolved;
}

export async function appendErrorLog(context: string, error: unknown) {
  await ensureStorageDirectories();
  const message = error instanceof Error ? `${error.message}\n${error.stack || ""}` : String(error);
  const line = `[${new Date().toISOString()}] ${context}: ${message}\n`;
  await fs.appendFile(path.join(storageRoot, "logs", "error.log"), line, "utf8");
}
