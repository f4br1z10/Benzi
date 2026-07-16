import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { ensureStorageDirectories } from "../lib/files";

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} terminato con codice ${code}`)));
  });
}

async function setup() {
  const root = process.cwd();
  const envPath = path.join(root, ".env");
  try { await fs.access(envPath); } catch { await fs.copyFile(path.join(root, ".env.example"), envPath); }
  await ensureStorageDirectories();
  console.log("1/4 Generazione client database...");
  await run("npx", ["prisma", "generate"]);
  console.log("2/4 Applicazione migrazioni non distruttive...");
  await run("npx", ["tsx", "scripts/migrate.ts"]);
  console.log("3/4 Inserimento dati iniziali...");
  await run("npx", ["tsx", "prisma/seed.ts"]);
  console.log("4/4 Verifica browser locale per la generazione PDF...");
  await run("npx", ["playwright", "install", "chromium"]);
  console.log("Setup completato. Avvia l’app con: npm run dev");
}

setup().catch((error) => { console.error("Setup non completato:", error.message); process.exitCode = 1; });
