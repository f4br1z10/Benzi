export type CalculationItem = {
  quantity: number;
  unitPriceCents: number;
  priceIncludesVat?: boolean;
  discountPercent?: number;
  discountFixedCents?: number;
  vatRate?: number;
  purchaseCostCents?: number;
  type?: string;
};

export type LineTotals = {
  subtotalCents: number;
  discountCents: number;
  vatCents: number;
  totalCents: number;
  marginCents: number;
};

const round = (value: number) => Math.round((value + Number.EPSILON));

export function calculateLine(item: CalculationItem): LineTotals {
  if (item.type === "TITOLO" || item.type === "TESTO") {
    return { subtotalCents: 0, discountCents: 0, vatCents: 0, totalCents: 0, marginCents: 0 };
  }
  const quantity = Math.max(0, Number(item.quantity) || 0);
  const rate = Math.max(0, Number(item.vatRate) || 0) / 100;
  const base = round(quantity * Math.max(0, item.unitPriceCents || 0));
  const percentDiscount = round(base * Math.min(100, Math.max(0, Number(item.discountPercent) || 0)) / 100);
  const fixedDiscount = Math.min(Math.max(0, item.discountFixedCents || 0), Math.max(0, base - percentDiscount));
  const discountCents = percentDiscount + fixedDiscount;
  const discounted = Math.max(0, base - discountCents);
  let subtotalCents: number;
  let vatCents: number;
  let totalCents: number;
  if (item.priceIncludesVat !== false) {
    totalCents = discounted;
    subtotalCents = rate ? round(totalCents / (1 + rate)) : totalCents;
    vatCents = totalCents - subtotalCents;
  } else {
    subtotalCents = discounted;
    vatCents = round(subtotalCents * rate);
    totalCents = subtotalCents + vatCents;
  }
  const marginCents = subtotalCents - round(quantity * Math.max(0, item.purchaseCostCents || 0));
  return { subtotalCents, discountCents, vatCents, totalCents, marginCents };
}

export function calculateQuote(items: CalculationItem[]) {
  return items.reduce((sum, item) => {
    const line = calculateLine(item);
    sum.subtotalCents += line.subtotalCents;
    sum.discountCents += line.discountCents;
    sum.vatCents += line.vatCents;
    sum.totalCents += line.totalCents;
    sum.estimatedMarginCents += line.marginCents;
    return sum;
  }, { subtotalCents: 0, discountCents: 0, vatCents: 0, totalCents: 0, estimatedMarginCents: 0 });
}

export function paymentSplit(totalCents: number, depositPercent: number) {
  const depositCents = round(totalCents * Math.min(100, Math.max(0, depositPercent)) / 100);
  return { depositCents, balanceCents: totalCents - depositCents, balancePercent: 100 - depositPercent };
}
