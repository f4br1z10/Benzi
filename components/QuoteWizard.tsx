"use client";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { calculateQuote, incentiveNet, paymentSplit } from "@/lib/calculations";
import { formatCurrency, parseEuroToCents } from "@/lib/format";
import { TECHNICAL_CATEGORY_FIELDS } from "@/lib/constants";
import QuotePreview from "@/components/QuotePreview";
import Toast from "@/components/Toast";
type Props = { quoteId?: number };
const money = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const cents = parseEuroToCents;
const today = () => new Date().toISOString().slice(0, 10);
const emptyLine = {
  type: "LIBERA",
  productId: null,
  serviceId: null,
  description: "",
  quantity: 1,
  unit: "pz",
  unitPrice: "0,00",
  priceIncludesVat: true,
  discountPercent: 0,
  discountFixed: "0,00",
  vatRate: 22,
  purchaseCost: "0,00",
  configurationSnapshot: "",
};
const defaults: any = {
  customerId: "",
  categoryId: "",
  status: "BOZZA",
  quoteDate: today(),
  validityDays: 30,
  seller: "",
  subject: "",
  deliveryTime: "",
  internalNotes: "",
  installationAddressSnapshot: "",
  technicalConfiguration: {},
  paymentMethod: "Bonifico bancario",
  paymentConditions: "",
  paymentSchedule: [],
  depositPercent: 0,
  financingAvailable: false,
  financingType: "TOTALE",
  financingNotes: "",
  incentive: "Nessun incentivo",
  incentivePercent: 0,
  incentiveAmount: "0,00",
  fiscalNote: "",
  visibleNotes: "",
  additionalConditions: "",
  attachmentMode: "NESSUNO",
  selectedAttachmentIds: [],
  items: [{ ...emptyLine }],
};
export default function QuoteWizard({ quoteId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [toast, setToast] = useState<{ m: string; e?: boolean } | null>(null);
  const [quickCustomer, setQuickCustomer] = useState(false);
  const [quick, setQuick] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    city: "",
  });
  const autoDeposit = useRef(false);
  const form = useForm<any>({ defaultValues: defaults });
  const lines = useFieldArray({ control: form.control, name: "items" });
  const scheduleLines = useFieldArray({
    control: form.control,
    name: "paymentSchedule",
  });
  const values = form.watch();
  const selectedCustomer = customers.find(
    (c) => c.id === Number(values.customerId),
  );
  const selectedCategory = categories.find(
    (c) => c.id === Number(values.categoryId),
  );
  useEffect(() => {
    (async () => {
      const endpoints = [
        fetch("/api/customers"),
        fetch("/api/products"),
        fetch("/api/services"),
        fetch("/api/categories"),
        fetch("/api/settings"),
      ];
      const [a, b, c, d, e] = await Promise.all(endpoints);
      const [cs, ps, ss, cats, config] = await Promise.all([
        a.json(),
        b.json(),
        c.json(),
        d.json(),
        e.json(),
      ]);
      setCustomers(cs);
      setProducts(ps.filter((p: any) => p.active));
      setServices(ss.filter((s: any) => s.active));
      setCategories(cats.filter((x: any) => x.active));
      setSettings(config.settings);
      if (quoteId) {
        const res = await fetch(`/api/quotes/${quoteId}`);
        const q = await res.json();
        form.reset({
          ...q,
          customerId: String(q.customerId),
          categoryId: String(q.categoryId || ""),
          quoteDate: new Date(q.quoteDate).toISOString().slice(0, 10),
          depositPercent: Number(q.depositPercent),
          incentivePercent: Number(q.incentivePercent || 0),
          incentiveAmount: money(q.incentiveAmountCents || 0),
          paymentSchedule: q.paymentSchedule
            ? JSON.parse(q.paymentSchedule)
            : [],
          selectedAttachmentIds:
            q.attachmentSelections
              ?.filter((entry: any) => entry.selected)
              .map((entry: any) => entry.attachmentId) || [],
          technicalConfiguration: q.technicalConfiguration
            ? JSON.parse(q.technicalConfiguration)
            : {},
          items: q.items.map((i: any) => ({
            ...i,
            quantity: Number(i.quantity),
            discountPercent: Number(i.discountPercent),
            vatRate: Number(i.vatRate),
            unitPrice: money(i.unitPriceCents),
            discountFixed: money(i.discountFixedCents),
            purchaseCost: money(i.purchaseCostCents),
          })),
        });
      } else
        form.reset({
          ...defaults,
          seller: config.settings?.defaultSeller || "",
          validityDays: config.settings?.defaultValidityDays || 30,
          deliveryTime: config.settings?.defaultDeliveryTime || "",
          paymentConditions: config.settings?.defaultPaymentConditions || "",
          fiscalNote: config.settings?.defaultTaxNote || "",
          visibleNotes: config.settings?.standardNotes || "",
        });
      setLoading(false);
    })();
  }, [quoteId]);
  // React Hook Form può mantenere lo stesso riferimento dell'array quando cambia
  // un campo interno. Il calcolo deve quindi essere eseguito a ogni render del watch.
  const calcItems = (values.items || []).map((i: any) => ({
    type: i.type,
    quantity: Number(i.quantity) || 0,
    unitPriceCents: cents(i.unitPrice),
    priceIncludesVat: i.priceIncludesVat !== false,
    discountPercent: Number(i.discountPercent) || 0,
    discountFixedCents: cents(i.discountFixed),
    vatRate: Number(i.vatRate) || 0,
    purchaseCostCents: cents(i.purchaseCost),
  }));
  const totals = calculateQuote(calcItems);
  const split = paymentSplit(
    totals.totalCents,
    Number(values.depositPercent) || 0,
  );
  const incentive = incentiveNet(
    totals.totalCents,
    Number(values.incentivePercent) || 0,
    cents(values.incentiveAmount),
  );
  useEffect(() => {
    if (
      !autoDeposit.current &&
      settings &&
      values.paymentMethod === "Misto" &&
      totals.totalCents > settings.depositThresholdCents &&
      Number(form.getValues("depositPercent")) === 0
    ) {
      form.setValue(
        "depositPercent",
        Number(settings.defaultDepositPercent || 50),
        { shouldDirty: true },
      );
      autoDeposit.current = true;
    }
  }, [totals.totalCents, settings, values.paymentMethod]);
  function addProduct(id: string) {
    const p = products.find((x) => x.id === Number(id));
    if (!p) return;
    lines.append({
      ...emptyLine,
      type: "PRODOTTO",
      productId: p.id,
      title: p.name,
      description: p.quoteDescription || p.description || p.name,
      unit: p.unit,
      unitPrice: money(p.salePriceInclVatCents),
      vatRate: Number(p.vatRate),
      purchaseCost: money(p.purchaseCostCents),
      configurationSnapshot: JSON.stringify({
        brand: p.brand,
        model: p.model,
        imagePath: p.imagePath,
      }),
    });
    const categoryIds = new Set(
      [...(form.getValues("items") || []), { productId: p.id }]
        .map((item: any) =>
          products.find((product: any) => product.id === Number(item.productId))
            ?.categoryId,
        )
        .filter(Boolean),
    );
    const nextCategory =
      categoryIds.size > 1
        ? categories.find((category) => category.slug === "multiprodotto")
        : categories.find((category) => category.id === p.categoryId);
    if (nextCategory) {
      form.setValue("categoryId", String(nextCategory.id), {
        shouldDirty: true,
      });
    }
  }
  function addService(id: string) {
    const s = services.find((x) => x.id === Number(id));
    if (!s) return;
    lines.append({
      ...emptyLine,
      type: "SERVIZIO",
      serviceId: s.id,
      title: s.name,
      description: s.description || s.name,
      unit: s.unit,
      unitPrice: money(s.defaultPriceCents),
      vatRate: Number(s.vatRate),
    });
  }
  function duplicateLine(i: number) {
    lines.insert(i + 1, { ...form.getValues(`items.${i}`) });
  }
  function drop(from: number, to: number) {
    if (from !== to) lines.move(from, to);
  }
  async function save(status: string) {
    const v = form.getValues();
    if (!v.customerId) {
      setStep(0);
      setToast({ m: "Seleziona un cliente", e: true });
      return;
    }
    if (!v.items?.length) {
      setStep(2);
      setToast({ m: "Inserisci almeno una riga", e: true });
      return;
    }
    if (v.paymentMethod === "Stato di avanzamento lavori") {
      const scheduleTotal = (v.paymentSchedule || []).reduce(
        (sum: number, entry: any) => sum + (Number(entry.percent) || 0),
        0,
      );
      if (!v.paymentSchedule?.length || Math.abs(scheduleTotal - 100) > 0.01) {
        setStep(3);
        setToast({
          m: "Le percentuali dello stato di avanzamento lavori devono totalizzare 100%",
          e: true,
        });
        return;
      }
    }
    const body = {
      ...v,
      status,
      customerId: Number(v.customerId),
      categoryId: v.categoryId ? Number(v.categoryId) : null,
      incentiveAmountCents: ["Detrazione 50%", "Detrazione 65%"].includes(
        v.incentive,
      )
        ? 0
        : cents(v.incentiveAmount),
      financingAvailable: v.paymentMethod === "Finanziamento",
      quoteDate: new Date(`${v.quoteDate}T12:00:00`),
      installationAddressSnapshot:
        v.installationAddressSnapshot ||
        JSON.stringify(
          selectedCustomer?.addresses?.find(
            (a: any) => a.type === "INSTALLAZIONE",
          ) ||
            selectedCustomer?.addresses?.[0] ||
            {},
        ),
      technicalConfiguration: JSON.stringify(v.technicalConfiguration || {}),
      items: v.items.map((i: any, index: number) => ({
        ...i,
        position: index,
        unitPriceCents: cents(i.unitPrice),
        discountFixedCents: cents(i.discountFixed),
        purchaseCostCents: cents(i.purchaseCost),
        configurationSnapshot: i.configurationSnapshot || null,
      })),
    };
    const res = await fetch(
      quoteId ? `/api/quotes/${quoteId}` : "/api/quotes",
      {
        method: quoteId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      setToast({ m: data.error || "Salvataggio non riuscito", e: true });
      return;
    }
    form.reset(v);
    router.push(`/preventivi/${data.id}`);
    router.refresh();
  }
  async function createQuick() {
    const body = {
      type: "PRIVATO",
      firstName: quick.firstName,
      lastName: quick.lastName,
      phone: quick.phone,
      email: quick.email,
      allowDuplicate: true,
      addresses: [
        { type: "RESIDENZA", city: quick.city, isDefault: true },
        { type: "INSTALLAZIONE", city: quick.city, isDefault: true },
      ],
    };
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setToast({ m: data.error, e: true });
      return;
    }
    setCustomers([...customers, data]);
    form.setValue("customerId", String(data.id), { shouldDirty: true });
    setQuickCustomer(false);
  }
  if (loading)
    return (
      <div className="card empty">
        <strong>Caricamento preventivo…</strong>Sto preparando catalogo e
        impostazioni.
      </div>
    );
  const steps = [
    "Cliente",
    "Informazioni",
    "Prodotti e servizi",
    "Pagamento",
    "Incentivi e note",
    "Anteprima",
  ];
  const fields = TECHNICAL_CATEGORY_FIELDS[selectedCategory?.slug] || [];
  const selectedProductIds = new Set((values.items || []).map((item: any) => Number(item.productId)).filter(Boolean));
  const availableAttachments = products.filter((product) => selectedProductIds.has(product.id)).flatMap((product) => product.attachments || []);
  return (
    <>
      <div className="tabs">
        {steps.map((s, i) => (
          <button
            key={s}
            className={`tab ${step === i ? "active" : ""}`}
            onClick={() => setStep(i)}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>
      <div className="wizard-layout">
        <div className="card">
          <div className="card-body">
            {step === 0 && (
              <div className="form-grid">
                <div className="field span-full">
                  <label>Cliente *</label>
                  <select
                    className="select"
                    {...form.register("customerId", { required: true })}
                  >
                    <option value="">Cerca o seleziona un cliente</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName ||
                          [c.firstName, c.lastName]
                            .filter(Boolean)
                            .join(" ")}{" "}
                        · {c.phone || c.taxCode || "nessun contatto"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="actions span-full">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setQuickCustomer(true)}
                  >
                    + Crea cliente rapido
                  </button>
                </div>
                {selectedCustomer && (
                  <>
                    <div className="section-title">
                      Indirizzo di installazione
                    </div>
                    <div className="field span-full">
                      <label>Indirizzo</label>
                      <select
                        className="select"
                        onChange={(e) =>
                          form.setValue(
                            "installationAddressSnapshot",
                            e.target.value,
                            { shouldDirty: true },
                          )
                        }
                      >
                        <option value="">
                          Usa indirizzo di installazione predefinito
                        </option>
                        {selectedCustomer.addresses.map((a: any) => (
                          <option key={a.id} value={JSON.stringify(a)}>
                            {[
                              a.address,
                              a.streetNumber,
                              a.postalCode,
                              a.city,
                              a.province,
                            ]
                              .filter(Boolean)
                              .join(" ") || "Indirizzo non compilato"}{" "}
                            ({a.type.toLowerCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}
            {step === 1 && (
              <div className="form-grid form-grid-3">
                <div className="field">
                  <label>Data preventivo</label>
                  <input
                    type="date"
                    className="input"
                    {...form.register("quoteDate")}
                  />
                </div>
                <div className="field">
                  <label>Validità (giorni)</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    {...form.register("validityDays")}
                  />
                </div>
                <div className="field">
                  <label>Venditore</label>
                  <input className="input" {...form.register("seller")} />
                </div>
                <div className="field">
                  <label>Categoria principale</label>
                  <select className="select" {...form.register("categoryId")}>
                    <option value="">Altro</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field span-2">
                  <label>Oggetto del preventivo</label>
                  <input className="input" {...form.register("subject")} />
                </div>
                <div className="field">
                  <label>Tempi di consegna</label>
                  <input className="input" {...form.register("deliveryTime")} />
                </div>
                <div className="field span-2">
                  <label>Note interne (non stampate)</label>
                  <textarea
                    className="textarea"
                    {...form.register("internalNotes")}
                  />
                </div>
                {fields.length > 0 && (
                  <>
                    <div className="section-title">
                      Configurazione tecnica · {selectedCategory?.name}
                    </div>
                    {fields.map((f) => (
                      <div
                        className={`field ${f.type === "textarea" ? "span-full" : ""}`}
                        key={f.key}
                      >
                        <label>{f.label}</label>
                        {f.type === "textarea" ? (
                          <textarea
                            className="textarea"
                            {...form.register(
                              `technicalConfiguration.${f.key}`,
                            )}
                          />
                        ) : f.type === "checkbox" ? (
                          <label className="actions">
                            <input
                              type="checkbox"
                              {...form.register(
                                `technicalConfiguration.${f.key}`,
                              )}
                            />{" "}
                            Sì
                          </label>
                        ) : f.options ? (
                          <select
                            className="select"
                            {...form.register(
                              `technicalConfiguration.${f.key}`,
                            )}
                          >
                            <option value="">Seleziona</option>
                            {f.options.map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="input"
                            {...form.register(
                              `technicalConfiguration.${f.key}`,
                            )}
                          />
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
            {step === 2 && (
              <div>
                <div className="actions" style={{ marginBottom: 14 }}>
                  <select
                    className="select"
                    style={{ maxWidth: 300 }}
                    defaultValue=""
                    onChange={(e) => {
                      addProduct(e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">+ Aggiungi prodotto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {formatCurrency(p.salePriceInclVatCents)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="select"
                    style={{ maxWidth: 280 }}
                    defaultValue=""
                    onChange={(e) => {
                      addService(e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">+ Aggiungi servizio</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {formatCurrency(s.defaultPriceCents)}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-secondary"
                    onClick={() => lines.append({ ...emptyLine })}
                  >
                    + Riga libera
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      lines.append({
                        ...emptyLine,
                        type: "TITOLO",
                        unit: "",
                        quantity: 0,
                      })
                    }
                  >
                    + Titolo
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      lines.append({
                        ...emptyLine,
                        type: "TESTO",
                        unit: "",
                        quantity: 0,
                      })
                    }
                  >
                    + Testo
                  </button>
                </div>
                <div className="quote-line quote-line-head">
                  <span></span>
                  <span>Descrizione</span>
                  <span>Q.tà</span>
                  <span>U.M.</span>
                  <span>Prezzo</span>
                  <span>Sconto %</span>
                  <span>IVA %</span>
                  <span></span>
                </div>
                {lines.fields.map((field, i) => (
                  <div
                    className="quote-line"
                    key={field.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", String(i))
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) =>
                      drop(Number(e.dataTransfer.getData("text/plain")), i)
                    }
                  >
                    <div className="drag">⋮⋮</div>
                    <div className="line-description field">
                      <textarea
                        className="textarea"
                        style={{ minHeight: 70 }}
                        {...form.register(`items.${i}.description`)}
                        placeholder="Descrizione su più righe"
                      />
                      <div className="actions">
                        <select
                          className="select"
                          style={{ minHeight: 32, padding: 5, maxWidth: 140 }}
                          {...form.register(`items.${i}.type`)}
                        >
                          <option value="PRODOTTO">Prodotto</option>
                          <option value="SERVIZIO">Servizio</option>
                          <option value="LIBERA">Riga libera</option>
                          <option value="TITOLO">Titolo</option>
                          <option value="TESTO">Testo</option>
                        </select>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => duplicateLine(i)}
                        >
                          Duplica
                        </button>
                      </div>
                    </div>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      {...form.register(`items.${i}.quantity`)}
                    />
                    <input
                      className="input"
                      {...form.register(`items.${i}.unit`)}
                    />
                    <input
                      className="input"
                      inputMode="decimal"
                      {...form.register(`items.${i}.unitPrice`)}
                    />
                    <input
                      className="input"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      {...form.register(`items.${i}.discountPercent`)}
                    />
                    <input
                      className="input"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      {...form.register(`items.${i}.vatRate`)}
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => lines.remove(i)}
                      aria-label="Elimina riga"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {step === 3 && (
              <div className="form-grid">
                <div className="field">
                  <label>Metodo di pagamento</label>
                  <select
                    className="select"
                    {...form.register("paymentMethod", {
                      onChange: (event) => {
                        const method = event.target.value;
                        if (
                          method === "Stato di avanzamento lavori" &&
                          !form.getValues("paymentSchedule")?.length
                        ) {
                          scheduleLines.append([
                            { label: "Acconto", percent: 50, dueDate: "" },
                            { label: "Saldo", percent: 50, dueDate: "" },
                          ]);
                        }
                        if (method !== "Misto") {
                          form.setValue("depositPercent", 0, {
                            shouldDirty: true,
                          });
                        }
                      },
                    })}
                  >
                    <option>Bonifico bancario</option>
                    <option>Finanziamento</option>
                    <option>Misto</option>
                    <option>Stato di avanzamento lavori</option>
                  </select>
                </div>
                <div className="field span-full">
                  <label>Condizioni di pagamento</label>
                  <textarea
                    className="textarea"
                    {...form.register("paymentConditions")}
                  />
                </div>
                {values.paymentMethod === "Misto" && (
                  <>
                    <div className="field">
                      <label>Percentuale acconto</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="input"
                        {...form.register("depositPercent")}
                      />
                    </div>
                    <div className="field">
                      <label>Importo acconto</label>
                      <input
                        className="input"
                        value={formatCurrency(split.depositCents)}
                        disabled
                      />
                    </div>
                    <div className="field">
                      <label>Saldo ({split.balancePercent}%)</label>
                      <input
                        className="input"
                        value={formatCurrency(split.balanceCents)}
                        disabled
                      />
                    </div>
                  </>
                )}
                {values.paymentMethod === "Finanziamento" && (
                  <>
                    <div className="field">
                      <label>Tipo finanziamento</label>
                      <select className="select" {...form.register("financingType")}>
                        <option value="TOTALE">Totale</option>
                        <option value="PARZIALE">Parziale</option>
                      </select>
                    </div>
                    <div className="field span-full">
                      <label>Note finanziamento</label>
                      <textarea className="textarea" {...form.register("financingNotes")} />
                    </div>
                  </>
                )}
                {values.paymentMethod === "Stato di avanzamento lavori" && (
                  <div className="span-full">
                    <div className="section-title">Rate e scadenze SAL</div>
                    <div className="stack" style={{ marginTop: 12 }}>
                      {scheduleLines.fields.map((entry, index) => {
                        const percent = Number(
                          values.paymentSchedule?.[index]?.percent,
                        ) || 0;
                        return (
                          <div className="form-grid form-grid-3" key={entry.id}>
                            <div className="field">
                              <label>Rata</label>
                              <input className="input" {...form.register(`paymentSchedule.${index}.label`)} />
                            </div>
                            <div className="field">
                              <label>Percentuale</label>
                              <input type="number" min="0" max="100" step="0.01" className="input" {...form.register(`paymentSchedule.${index}.percent`)} />
                            </div>
                            <div className="field">
                              <label>Scadenza</label>
                              <input type="date" className="input" {...form.register(`paymentSchedule.${index}.dueDate`)} />
                            </div>
                            <div className="actions span-full">
                              <strong>{formatCurrency(Math.round(totals.totalCents * percent / 100))}</strong>
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => scheduleLines.remove(index)}>Elimina rata</button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="actions">
                        <button type="button" className="btn btn-secondary" onClick={() => scheduleLines.append({ label: `Rata ${scheduleLines.fields.length + 1}`, percent: 0, dueDate: "" })}>+ Aggiungi rata</button>
                        <span className="help-text">Totale percentuali: {(values.paymentSchedule || []).reduce((sum: number, entry: any) => sum + (Number(entry.percent) || 0), 0)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {step === 4 && (
              <div className="form-grid">
                <div className="field">
                  <label>Incentivo richiesto</label>
                  <select className="select" {...form.register("incentive", {
                    onChange: (event) => {
                      const selected = event.target.value;
                      form.setValue(
                        "incentivePercent",
                        selected === "Detrazione 50%"
                          ? 50
                          : selected === "Detrazione 65%"
                            ? 65
                            : 0,
                        { shouldDirty: true },
                      );
                      if (selected === "Nessun incentivo") {
                        form.setValue("incentiveAmount", "0,00", {
                          shouldDirty: true,
                        });
                      }
                    },
                  })}>
                    <option>Detrazione 50%</option>
                    <option>Detrazione 65%</option>
                    <option>Conto Termico</option>
                    <option>Nessun incentivo</option>
                    <option>Altro</option>
                  </select>
                </div>
                {["Conto Termico", "Altro"].includes(values.incentive) && (
                  <div className="field">
                    <label>Importo incentivo (€)</label>
                    <input className="input" inputMode="decimal" {...form.register("incentiveAmount")} />
                  </div>
                )}
                <div className="field">
                  <label>Incentivo calcolato</label>
                  <input className="input" value={formatCurrency(incentive.incentiveAmountCents)} disabled />
                </div>
                <div className="field">
                  <label>Totale da pagare al netto dell’incentivo</label>
                  <input className="input" value={formatCurrency(incentive.netAfterIncentiveCents)} disabled />
                </div>
                <div className="field">
                  <label>Schede tecniche nel PDF</label>
                  <select
                    className="select"
                    {...form.register("attachmentMode")}
                  >
                    <option value="NESSUNO">Non allegare</option>
                    <option value="TUTTE">Allega tutte</option>
                    <option value="SELEZIONATE">Solo schede selezionate</option>
                  </select>
                </div>
                {values.attachmentMode === "SELEZIONATE" && (
                  <div className="field span-full">
                    <label>Schede da allegare</label>
                    {availableAttachments.length ? (
                      <div className="stack" style={{ gap: 8 }}>
                        {availableAttachments.map((attachment: any) => (
                          <label className="actions" key={attachment.id}>
                            <input type="checkbox" value={attachment.id} {...form.register("selectedAttachmentIds")} />
                            {attachment.originalName} ({Math.ceil(attachment.sizeBytes / 1024)} KB)
                          </label>
                        ))}
                      </div>
                    ) : (
                      <span className="help-text">I prodotti inseriti non hanno schede tecniche caricate.</span>
                    )}
                  </div>
                )}
                <div className="field span-full">
                  <label>Nota fiscale</label>
                  <textarea
                    className="textarea"
                    {...form.register("fiscalNote")}
                  />
                </div>
                <div className="field span-full">
                  <label>Note visibili nel preventivo</label>
                  <textarea
                    className="textarea"
                    {...form.register("visibleNotes")}
                  />
                </div>
                <div className="field span-full">
                  <label>Condizioni aggiuntive</label>
                  <textarea
                    className="textarea"
                    {...form.register("additionalConditions")}
                  />
                </div>
              </div>
            )}
            {step === 5 && (
              <QuotePreview
                data={values}
                customer={selectedCustomer}
                category={selectedCategory}
                totals={totals}
              />
            )}
            <div
              className="actions"
              style={{ justifyContent: "space-between", marginTop: 22 }}
            >
              <button
                className="btn btn-secondary"
                disabled={step === 0}
                onClick={() => setStep(Math.max(0, step - 1))}
              >
                ← Indietro
              </button>
              <div className="actions">
                {form.formState.isDirty && (
                  <span className="unsaved">Modifiche non salvate</span>
                )}
                {step < 5 ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => setStep(Math.min(5, step + 1))}
                  >
                    Continua →
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={() => save("BOZZA")}
                    >
                      Salva bozza
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => save("EMESSO")}
                    >
                      Salva ed emetti
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <aside className="card summary-card">
          <div className="card-header">
            <h3>Riepilogo</h3>
          </div>
          <div className="card-body">
            <div className="summary-row">
              <span>Imponibile</span>
              <strong>{formatCurrency(totals.subtotalCents)}</strong>
            </div>
            <div className="summary-row">
              <span>Sconti</span>
              <strong>- {formatCurrency(totals.discountCents)}</strong>
            </div>
            <div className="summary-row">
              <span>IVA</span>
              <strong>{formatCurrency(totals.vatCents)}</strong>
            </div>
            <div className="summary-row summary-total">
              <span>Totale</span>
              <strong>{formatCurrency(totals.totalCents)}</strong>
            </div>
            <div className="margin-box">
              <strong>Margine stimato interno</strong>
              <br />
              {formatCurrency(totals.estimatedMarginCents)}
              <br />
              <small>Non sarà stampato nel PDF</small>
            </div>
          </div>
        </aside>
      </div>
      {quickCustomer && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>Cliente rapido</h2>
              <button
                className="icon-btn"
                onClick={() => setQuickCustomer(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field">
                  <label>Nome</label>
                  <input
                    className="input"
                    value={quick.firstName}
                    onChange={(e) =>
                      setQuick({ ...quick, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>Cognome</label>
                  <input
                    className="input"
                    value={quick.lastName}
                    onChange={(e) =>
                      setQuick({ ...quick, lastName: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>Telefono</label>
                  <input
                    className="input"
                    value={quick.phone}
                    onChange={(e) =>
                      setQuick({ ...quick, phone: e.target.value })
                    }
                  />
                </div>
                <div className="field">
                  <label>E-mail</label>
                  <input
                    className="input"
                    value={quick.email}
                    onChange={(e) =>
                      setQuick({ ...quick, email: e.target.value })
                    }
                  />
                </div>
                <div className="field span-full">
                  <label>Comune</label>
                  <input
                    className="input"
                    value={quick.city}
                    onChange={(e) =>
                      setQuick({ ...quick, city: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setQuickCustomer(false)}
              >
                Annulla
              </button>
              <button className="btn btn-primary" onClick={createQuick}>
                Crea e seleziona
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <Toast
          message={toast.m}
          error={toast.e}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
