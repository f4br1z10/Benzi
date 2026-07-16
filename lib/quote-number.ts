export function formatQuoteNumber(format: string, year: number, sequence: number) {
  return format
    .replaceAll("{YYYY}", String(year))
    .replaceAll("{YY}", String(year).slice(-2))
    .replace(/\{N+\}/g, (token) => String(sequence).padStart(token.length - 2, "0"));
}

export async function nextQuoteNumber(
  countForYear: (start: Date, end: Date) => Promise<number>,
  format = "PREV-{YYYY}-{NNNN}",
  date = new Date()
) {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await countForYear(start, end);
  return formatQuoteNumber(format, year, count + 1);
}
