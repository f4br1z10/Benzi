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

export type SignificantGoodsVatLine = LineTotals & {
  taxableAt10Cents: number;
  taxableAt22Cents: number;
  vat10Cents: number;
  vat22Cents: number;
};

export type SignificantGoodsVatTotals = {
  subtotalCents: number;
  discountCents: number;
  vatCents: number;
  totalCents: number;
  estimatedMarginCents: number;
  goodsSubtotalCents: number;
  laborSubtotalCents: number;
  taxableAt10Cents: number;
  taxableAt22Cents: number;
  vat10Cents: number;
  vat22Cents: number;
  vatMode: "10" | "22" | "MISTA";
  lineTotals: SignificantGoodsVatLine[];
};

/**
 * Ripartizione IVA per beni significativi:
 * - manodopera (SERVIZIO/LIBERA) sempre al 10%;
 * - beni al 10% fino a concorrenza della manodopera;
 * - eventuale eccedenza dei beni al 22%.
 * I prezzi vengono prima normalizzati all'imponibile tramite calculateLine.
 */
export function calculateSignificantGoodsVat(items: CalculationItem[]): SignificantGoodsVatTotals {
  const baseLines = items.map(calculateLine);
  const goodsSubtotalCents = items.reduce((sum, item, index) =>
    sum + (item.type === "PRODOTTO" ? baseLines[index].subtotalCents : 0), 0);
  const laborSubtotalCents = items.reduce((sum, item, index) =>
    sum + (!["PRODOTTO", "TITOLO", "TESTO"].includes(item.type || "LIBERA") ? baseLines[index].subtotalCents : 0), 0);
  let goodsAt10Remaining = Math.min(goodsSubtotalCents, laborSubtotalCents);
  const lineTotals = items.map((item, index): SignificantGoodsVatLine => {
    const base = baseLines[index];
    if (["TITOLO", "TESTO"].includes(item.type || "")) {
      return { ...base, taxableAt10Cents: 0, taxableAt22Cents: 0, vat10Cents: 0, vat22Cents: 0 };
    }
    const taxableAt10Cents = item.type === "PRODOTTO"
      ? Math.min(base.subtotalCents, goodsAt10Remaining)
      : base.subtotalCents;
    if (item.type === "PRODOTTO") goodsAt10Remaining -= taxableAt10Cents;
    const taxableAt22Cents = base.subtotalCents - taxableAt10Cents;
    const vat10Cents = round(taxableAt10Cents * 0.10);
    const vat22Cents = round(taxableAt22Cents * 0.22);
    const vatCents = vat10Cents + vat22Cents;
    return { ...base, vatCents, totalCents: base.subtotalCents + vatCents, taxableAt10Cents, taxableAt22Cents, vat10Cents, vat22Cents };
  });
  const taxableAt10Cents = lineTotals.reduce((sum, line) => sum + line.taxableAt10Cents, 0);
  const taxableAt22Cents = lineTotals.reduce((sum, line) => sum + line.taxableAt22Cents, 0);
  const vat10Cents = lineTotals.reduce((sum, line) => sum + line.vat10Cents, 0);
  const vat22Cents = lineTotals.reduce((sum, line) => sum + line.vat22Cents, 0);
  const subtotalCents = goodsSubtotalCents + laborSubtotalCents;
  const vatCents = vat10Cents + vat22Cents;
  return {
    subtotalCents,
    discountCents: baseLines.reduce((sum, line) => sum + line.discountCents, 0),
    vatCents,
    totalCents: subtotalCents + vatCents,
    estimatedMarginCents: baseLines.reduce((sum, line) => sum + line.marginCents, 0),
    goodsSubtotalCents,
    laborSubtotalCents,
    taxableAt10Cents,
    taxableAt22Cents,
    vat10Cents,
    vat22Cents,
    vatMode: taxableAt22Cents === 0 ? "10" : taxableAt10Cents === 0 ? "22" : "MISTA",
    lineTotals,
  };
}

export function incentiveNet(
  totalCents: number,
  incentivePercent: number,
  manualAmountCents = 0,
) {
  const safeTotal = Math.max(0, Math.round(totalCents));
  const safePercent = Math.min(100, Math.max(0, Number(incentivePercent) || 0));
  const calculated = Math.round((safeTotal * safePercent) / 100);
  const requested = manualAmountCents > 0 ? Math.round(manualAmountCents) : calculated;
  const incentiveAmountCents = Math.min(safeTotal, Math.max(0, requested));
  return {
    incentiveAmountCents,
    netAfterIncentiveCents: safeTotal - incentiveAmountCents,
  };
}
