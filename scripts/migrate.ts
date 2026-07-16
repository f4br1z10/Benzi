import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = path.resolve(process.cwd(), "storage", "sg-clima.db");
const migrationRoot = path.resolve(process.cwd(), "prisma", "migrations");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS AppMigration (name TEXT PRIMARY KEY, appliedAt TEXT NOT NULL);");
const applied = db.prepare("SELECT name FROM AppMigration").all().map((row) => String(row.name));
for (const name of fs.readdirSync(migrationRoot).filter((entry) => /^\d/.test(entry)).sort()) {
  if (applied.includes(name)) continue;
  const sql = fs.readFileSync(path.join(migrationRoot, name, "migration.sql"), "utf8");
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(sql);
    db.prepare("INSERT INTO AppMigration (name, appliedAt) VALUES (?, ?)").run(name, new Date().toISOString());
    db.exec("COMMIT");
    console.log(`Migrazione applicata: ${name}`);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
db.close();
