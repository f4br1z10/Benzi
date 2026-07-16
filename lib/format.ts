export const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

export const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));

export const formatDateTime = (value: Date | string) =>
  new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

export const slugify = (value: string) => value
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const customerDisplayName = (customer: { firstName?: string | null; lastName?: string | null; companyName?: string | null }) =>
  customer.companyName || [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Cliente senza nome";

export function parseEuroToCents(value: unknown) {
  const raw = String(value ?? "").trim().replace(/\s|€/g, "");
  if (!raw) return 0;
  let normalized: string;
  if (raw.includes(",")) normalized = raw.replaceAll(".", "").replace(",", ".");
  else if (/^-?\d+\.\d{1,2}$/.test(raw)) normalized = raw;
  else normalized = raw.replaceAll(".", "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}
