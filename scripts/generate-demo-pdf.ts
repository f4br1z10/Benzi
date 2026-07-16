import "dotenv/config";
import path from "node:path";
import { prisma } from "../server/prisma";
import { generateQuotePdf } from "../server/pdf";

async function main() {
  const quote = await prisma.quote.findUnique({ where: { number: "PREV-2026-0001" } });
  if (!quote) throw new Error("Preventivo dimostrativo non trovato. Esegui npm run setup.");
  const target = path.resolve(process.cwd(), "output", "pdf", "esempio-preventivo.pdf");
  const result = await generateQuotePdf(quote.id, target);
  console.log(`PDF dimostrativo generato: ${result.path} (${result.size} byte)`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
