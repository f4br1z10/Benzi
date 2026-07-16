import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const root = process.cwd();
const resources = path.join(root, "src-tauri", "resources");
const serverTarget = path.join(resources, "server");
const templateTarget = path.join(resources, "template-data");
const browserTarget = path.join(resources, "browser");

async function copyDirectory(source: string, target: string) {
  await fs.cp(source, target, { recursive: true, force: true });
}

async function exists(target: string) {
  return fs.access(target).then(() => true, () => false);
}

async function main() {
  await fs.rm(resources, { recursive: true, force: true });
  await fs.mkdir(resources, { recursive: true });

  const standalone = path.join(root, ".next", "standalone");
  if (!(await exists(path.join(standalone, "server.js")))) {
    throw new Error("Build standalone Next.js non trovato.");
  }
  await copyDirectory(standalone, serverTarget);
  await copyDirectory(path.join(root, ".next", "static"), path.join(serverTarget, ".next", "static"));

  const nodeExecutable = process.execPath;
  await fs.mkdir(path.join(resources, "runtime"), { recursive: true });
  await fs.copyFile(nodeExecutable, path.join(resources, "runtime", "node.exe"));

  const prisma = new PrismaClient({
    datasourceUrl: `file:${path.join(root, "storage", "sg-clima.db").replaceAll("\\", "/")}`
  });
  await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)");
  await prisma.$disconnect();

  await fs.mkdir(path.join(templateTarget, "storage"), { recursive: true });
  await fs.copyFile(path.join(root, "storage", "sg-clima.db"), path.join(templateTarget, "storage", "sg-clima.db"));
  for (const directory of ["logos", "product-attachments", "product-images"]) {
    const source = path.join(root, "storage", directory);
    if (await exists(source)) await copyDirectory(source, path.join(templateTarget, "storage", directory));
  }

  const browserRoot = path.join(process.env.LOCALAPPDATA || "", "ms-playwright");
  const entries = await fs.readdir(browserRoot, { withFileTypes: true });
  const headless = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("chromium_headless_shell-"))
    .sort((a, b) => b.name.localeCompare(a.name))[0];
  if (!headless) throw new Error("Chromium headless di Playwright non trovato. Esegui: npx playwright install chromium");
  await copyDirectory(path.join(browserRoot, headless.name), browserTarget);

  console.log("Risorse desktop preparate in src-tauri/resources.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
