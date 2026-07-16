import { describe, expect, it } from "vitest";
import { calculateExpiryDate, daysUntil, isReminderDue, shouldAutoExpire } from "@/lib/dates";
import { format } from "date-fns";
import { formatQuoteNumber, nextQuoteNumber } from "@/lib/quote-number";
describe("date, numerazione e promemoria", () => {
  it("calcola la scadenza", () => expect(format(calculateExpiryDate("2026-01-01",30), "yyyy-MM-dd")).toBe("2026-01-31"));
  it("attiva il promemoria a cinque giorni", () => { const now=new Date("2026-01-10T12:00:00"); expect(isReminderDue("2026-01-15",now)).toBe(true); expect(daysUntil("2026-01-15",now)).toBe(5); expect(isReminderDue("2026-01-16",now)).toBe(false); });
  it("scade soltanto gli stati applicabili", () => { const now=new Date("2026-02-01T12:00:00"); expect(shouldAutoExpire("EMESSO","2026-01-01",now)).toBe(true); expect(shouldAutoExpire("ACCETTATO","2026-01-01",now)).toBe(false); });
  it("genera il formato progressivo configurato", async()=>{expect(formatQuoteNumber("P-{YY}-{NNNN}",2026,12)).toBe("P-26-0012");expect(await nextQuoteNumber(async()=>9,"PREV-{YYYY}-{NNNN}",new Date("2026-03-01"))).toBe("PREV-2026-0010")});
});
