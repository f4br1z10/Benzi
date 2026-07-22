import { incentiveNet } from "@/lib/calculations";
import { formatCurrency, formatDate, parseEuroToCents } from "@/lib/format";

function itemMeta(item: any) {
  try {
    return item.configurationSnapshot
      ? JSON.parse(item.configurationSnapshot)
      : {};
  } catch {
    return {};
  }
}

export default function QuotePreview({
  data,
  customer,
  category,
  totals,
  number = "Anteprima",
}: {
  data: any;
  customer: any;
  category: any;
  totals: any;
  number?: string;
}) {
  const address =
    customer?.addresses?.find((entry: any) => entry.type === "INSTALLAZIONE") ||
    customer?.addresses?.[0];
  const incentive = incentiveNet(
    totals.totalCents,
    Number(data.incentivePercent) || 0,
    parseEuroToCents(data.incentiveAmount),
  );
  return (
    <div style={{ background: "#edf1f3", padding: 20, borderRadius: 10, overflow: "auto" }}>
      <div style={{ width: 720, minHeight: 980, background: "white", margin: "0 auto", padding: "30px 42px", boxShadow: "0 8px 25px #ccd5da", fontFamily: "Arial", fontSize: 12 }}>
        <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#456e9b", color: "#fff", display: "grid", placeItems: "center", margin: "-30px auto 45px", fontWeight: 800 }}>1</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ lineHeight: 1.45 }}><strong>SG Clima S.r.l. Unipersonale</strong><br />P. IVA 17407831001<br />Piazza A. Gramsci n. 12 · Albano Laziale<br />Tel. 06 86 93 59 01</div>
          <div style={{ fontSize: 25, fontWeight: 800, color: "#17324d" }}>SG Clima</div>
        </div>
        <div style={{ textAlign: "right", marginBottom: 18 }}><strong>Data:</strong> {formatDate(data.quoteDate || new Date())}<br /><strong>Validità:</strong> {data.validityDays || 30} giorni</div>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #5cafd1", marginBottom: 14 }}><tbody><tr>{["Venditore", "Cliente", "Indirizzo", "Comune"].map((value) => <th key={value} style={{ border: "1px solid #5cafd1", padding: 6, textAlign: "left" }}>{value}</th>)}</tr><tr>{[data.seller || "—", customer?.companyName || [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "—", [address?.address, address?.streetNumber].filter(Boolean).join(" ") || "—", address?.city || "—"].map((value, index) => <td key={index} style={{ border: "1px solid #5cafd1", padding: 6 }}>{value}</td>)}</tr></tbody></table>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #5cafd1", marginBottom: 14 }}><tbody><tr>{["Prodotto", "Metodo di pagamento", "Condizioni di pagamento", "Tempi di consegna"].map((value) => <th key={value} style={{ border: "1px solid #5cafd1", padding: 6, textAlign: "left" }}>{value}</th>)}</tr><tr>{[category?.name || "Multiprodotto", data.paymentMethod || "—", data.paymentConditions || "—", data.deliveryTime || "—"].map((value, index) => <td key={index} style={{ border: "1px solid #5cafd1", padding: 6, whiteSpace: "pre-line" }}>{value}</td>)}</tr></tbody></table>
        <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={{ border: "1px solid #444", padding: 7, width: 65 }}>Quantità</th><th style={{ border: "1px solid #444", padding: 7, textAlign: "left" }}>Dettaglio fornitura</th></tr></thead><tbody>
          {(data.items || []).map((item: any, index: number) => {
            const meta = itemMeta(item);
            const structural = ["TITOLO", "TESTO"].includes(item.type);
            return <tr key={index}><td style={{ border: "1px solid #555", padding: 8, verticalAlign: "top", textAlign: "center" }}>{structural ? "" : item.quantity}</td><td style={{ border: "1px solid #555", padding: 8, whiteSpace: "pre-line", fontWeight: item.type === "TITOLO" ? 800 : 400 }}><div style={{ display: "flex", gap: 10 }}>{item.productId && <img src={`/api/products/${item.productId}/image`} alt="" style={{ width: 58, height: 58, objectFit: "contain" }} />}<div>{item.title && <strong>{item.title}<br /></strong>}{[meta.brand, meta.model].filter(Boolean).length > 0 && <small>Marca e modello: {[meta.brand, meta.model].filter(Boolean).join(" · ")}<br /></small>}{item.description || item.title}</div></div></td></tr>;
          })}
        </tbody></table>
        <div style={{ width: 360, marginLeft: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", border: "1px solid #555", padding: 8 }}><span>Imponibile</span><strong>{formatCurrency(totals.subtotalCents)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between", border: "1px solid #555", borderTop: 0, padding: 8 }}><span>IVA 10% su {formatCurrency(totals.taxableAt10Cents)}</span><strong>{formatCurrency(totals.vat10Cents)}</strong></div>
          {totals.taxableAt22Cents > 0 && <div style={{ display: "flex", justifyContent: "space-between", border: "1px solid #555", borderTop: 0, padding: 8 }}><span>IVA 22% su {formatCurrency(totals.taxableAt22Cents)}</span><strong>{formatCurrency(totals.vat22Cents)}</strong></div>}
          <div style={{ display: "flex", justifyContent: "space-between", border: "1px solid #555", borderTop: 0, padding: 8 }}><strong>Prezzo totale</strong><strong>{formatCurrency(totals.totalCents)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between", border: "1px solid #555", borderTop: 0, padding: 8 }}><span>Incentivo richiesto</span><strong>{formatCurrency(incentive.incentiveAmountCents)}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between", border: "1px solid #555", borderTop: 0, padding: 8 }}><span>Totale al netto dell’incentivo<br /><small>IVA inclusa</small></span><strong>{formatCurrency(incentive.netAfterIncentiveCents)}</strong></div>
        </div>
        <p style={{ marginTop: 35 }}>{data.fiscalNote}</p><div style={{ border: "1px solid #555", padding: 10, minHeight: 70, whiteSpace: "pre-line" }}><strong>Note</strong><br />{data.visibleNotes}</div><div style={{ fontSize: 18, marginTop: 80 }}>Firma per accettazione _________________________________</div><div style={{ textAlign: "right", color: "#8999a3", marginTop: 18 }}>{number}</div>
      </div>
    </div>
  );
}
