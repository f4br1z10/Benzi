import { describe, expect, it } from "vitest";
import { calculateLine, calculateQuote, incentiveNet, paymentSplit } from "@/lib/calculations";
import { parseEuroToCents } from "@/lib/format";
describe("calcoli economici", () => {
  it("calcola imponibile e IVA da un prezzo IVA inclusa", () => { const result=calculateLine({quantity:1,unitPriceCents:12200,priceIncludesVat:true,vatRate:22}); expect(result.subtotalCents).toBe(10000); expect(result.vatCents).toBe(2200); expect(result.totalCents).toBe(12200); });
  it("calcola sconto percentuale e fisso", () => { const result=calculateLine({quantity:2,unitPriceCents:10000,priceIncludesVat:false,discountPercent:10,discountFixedCents:1000,vatRate:22}); expect(result.discountCents).toBe(3000); expect(result.subtotalCents).toBe(17000); expect(result.vatCents).toBe(3740); expect(result.totalCents).toBe(20740); });
  it("somma subtotale, IVA, totale e margine", () => { const result=calculateQuote([{quantity:1,unitPriceCents:12200,vatRate:22,priceIncludesVat:true,purchaseCostCents:5000},{quantity:2,unitPriceCents:6100,vatRate:22,priceIncludesVat:true,purchaseCostCents:2000}]); expect(result.totalCents).toBe(24400); expect(result.subtotalCents).toBe(20000); expect(result.vatCents).toBe(4400); expect(result.estimatedMarginCents).toBe(11000); });
  it("divide acconto e saldo senza perdere centesimi", () => { expect(paymentSplit(9999,50)).toEqual({depositCents:5000,balanceCents:4999,balancePercent:50}); });
  it("calcola il totale al netto della detrazione", () => { expect(incentiveNet(100000,50)).toEqual({incentiveAmountCents:50000,netAfterIncentiveCents:50000}); });
  it("usa l'importo incentivo manuale senza superare il totale", () => { expect(incentiveNet(100000,0,120000)).toEqual({incentiveAmountCents:100000,netAfterIncentiveCents:0}); });
  it("converte correttamente i prezzi digitati nel servizio", () => {
    expect(parseEuroToCents("0,00")).toBe(0);
    expect(parseEuroToCents("125,50")).toBe(12550);
    expect(parseEuroToCents("125.50")).toBe(12550);
    expect(parseEuroToCents("1.250,50 €")).toBe(125050);
  });
});
