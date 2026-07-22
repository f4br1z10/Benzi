import { Prisma } from "@prisma/client";
import { addDays } from "date-fns";
import { prisma } from "@/server/prisma";
import { quoteSchema } from "@/lib/validators";
import { calculateExpiryDate, shouldAutoExpire } from "@/lib/dates";
import {
  calculateLine,
  calculateSignificantGoodsVat,
  incentiveNet,
  paymentSplit,
} from "@/lib/calculations";
import { nextQuoteNumber } from "@/lib/quote-number";

type QuoteInput = ReturnType<typeof quoteSchema.parse>;

function json(value: unknown) {
  return JSON.stringify(value);
}

async function quoteNumber(tx: Prisma.TransactionClient, date: Date) {
  const settings = await tx.companySettings.findUnique({ where: { id: 1 } });
  return nextQuoteNumber(
    (start, end) =>
      tx.quote.count({ where: { quoteDate: { gte: start, lt: end } } }),
    settings?.quoteNumberFormat || "PREV-{YYYY}-{NNNN}",
    date,
  );
}

async function snapshots(tx: Prisma.TransactionClient, input: QuoteInput) {
  const customer = await tx.customer.findUnique({
    where: { id: input.customerId },
    include: { addresses: true },
  });
  if (!customer) throw new Error("Cliente non trovato.");
  const category = input.categoryId
    ? await tx.category.findUnique({ where: { id: input.categoryId } })
    : null;
  return { customer, category };
}

async function prepareItems(tx: Prisma.TransactionClient, input: QuoteInput) {
  const productIds = input.items.flatMap((item) =>
    item.productId ? [item.productId] : [],
  );
  const serviceIds = input.items.flatMap((item) =>
    item.serviceId ? [item.serviceId] : [],
  );
  const [products, services] = await Promise.all([
    tx.product.findMany({ where: { id: { in: productIds } } }),
    tx.service.findMany({ where: { id: { in: serviceIds } } }),
  ]);
  return input.items.map((item, index) => {
    const product = products.find((entry) => entry.id === item.productId);
    const service = services.find((entry) => entry.id === item.serviceId);
    const { marginCents: _marginCents, ...calculated } = calculateLine(item);
    return {
      type: item.type,
      productId: item.productId || null,
      serviceId: item.serviceId || null,
      position: item.position ?? index,
      title: item.title || null,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPriceCents: item.unitPriceCents,
      priceIncludesVat: item.priceIncludesVat,
      discountPercent: item.discountPercent,
      discountFixedCents: item.discountFixedCents,
      vatRate: item.vatRate,
      purchaseCostCents:
        item.purchaseCostCents || product?.purchaseCostCents || 0,
      productSnapshot: product ? json(product) : null,
      serviceSnapshot: service ? json(service) : null,
      configurationSnapshot: item.configurationSnapshot || null,
      ...calculated,
    };
  });
}

function applyAutomaticVat(items: any[]) {
  const calculation = calculateSignificantGoodsVat(items);
  const calculatedItems = items.map((item, index) => {
    const line = calculation.lineTotals[index];
    return {
      ...item,
      subtotalCents: line.subtotalCents,
      discountCents: line.discountCents,
      vatCents: line.vatCents,
      totalCents: line.totalCents,
    };
  });
  const totals = {
    subtotalCents: calculation.subtotalCents,
    discountCents: calculation.discountCents,
    vatCents: calculation.vatCents,
    totalCents: calculation.totalCents,
    estimatedMarginCents: calculation.estimatedMarginCents,
  };
  return { items: calculatedItems, totals };
}

export async function createQuote(raw: unknown) {
  const input = quoteSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const [settings, snap, preparedItems] = await Promise.all([
      tx.companySettings.findUnique({ where: { id: 1 } }),
      snapshots(tx, input),
      prepareItems(tx, input),
    ]);
    const { items, totals } = applyAutomaticVat(preparedItems);
    const depositPercent =
      input.depositPercent ||
      (input.paymentMethod === "Misto" &&
      totals.totalCents > (settings?.depositThresholdCents ?? 299900)
        ? Number(settings?.defaultDepositPercent ?? 50)
        : 0);
    const split = paymentSplit(totals.totalCents, depositPercent);
    const incentive = incentiveNet(
      totals.totalCents,
      input.incentivePercent,
      input.incentiveAmountCents,
    );
    const expiryDate = calculateExpiryDate(input.quoteDate, input.validityDays);
    const number = await quoteNumber(tx, input.quoteDate);
    const status = input.status;
    const created = await tx.quote.create({
      data: {
        number,
        customerId: input.customerId,
        categoryId: input.categoryId || null,
        status,
        quoteDate: input.quoteDate,
        validityDays: input.validityDays,
        expiryDate,
        seller: input.seller,
        subject: input.subject,
        deliveryTime: input.deliveryTime,
        internalNotes: input.internalNotes,
        customerSnapshot: json(snap.customer),
        categorySnapshot: snap.category ? json(snap.category) : null,
        installationAddressSnapshot: input.installationAddressSnapshot,
        technicalConfiguration: input.technicalConfiguration,
        paymentMethod: input.paymentMethod,
        paymentConditions: input.paymentConditions,
        paymentSchedule: input.paymentSchedule.length
          ? json(input.paymentSchedule)
          : null,
        depositPercent,
        depositCents: split.depositCents,
        balancePercent: split.balancePercent,
        balanceCents: split.balanceCents,
        financingAvailable: input.financingAvailable,
        financingType: input.financingType,
        financingNotes: input.financingNotes,
        incentive: input.incentive,
        incentivePercent: input.incentivePercent,
        ...incentive,
        fiscalNote: input.fiscalNote,
        visibleNotes: input.visibleNotes,
        additionalConditions: input.additionalConditions,
        attachmentMode: input.attachmentMode,
        ...totals,
        issuedAt: status === "BOZZA" ? null : new Date(),
        statusHistory: {
          create: {
            toStatus: status,
            note:
              status === "BOZZA"
                ? "Preventivo creato come bozza"
                : "Preventivo creato ed emesso",
          },
        },
        reminders: { create: { dueAt: addDays(expiryDate, -5) } },
      },
    });
    await tx.quoteItem.createMany({
      data: items.map((item) => ({ ...item, quoteId: created.id })),
    });
    if (input.attachmentMode === "SELEZIONATE" && input.selectedAttachmentIds.length) {
      await tx.quoteAttachmentSelection.createMany({
        data: input.selectedAttachmentIds.map((attachmentId) => ({ quoteId: created.id, attachmentId, selected: true })),
      });
    }
    return tx.quote.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        items: { orderBy: { position: "asc" } },
        customer: true,
        category: true,
        statusHistory: true,
      },
    });
  });
}

export async function updateQuote(id: number, raw: unknown) {
  const input = quoteSchema.parse(raw);
  return prisma.$transaction(async (tx) => {
    const current = await tx.quote.findUnique({ where: { id } });
    if (!current) throw new Error("Preventivo non trovato.");
    const [snap, preparedItems] = await Promise.all([
      snapshots(tx, input),
      prepareItems(tx, input),
    ]);
    const { items, totals } = applyAutomaticVat(preparedItems);
    const split = paymentSplit(totals.totalCents, input.depositPercent);
    const incentive = incentiveNet(
      totals.totalCents,
      input.incentivePercent,
      input.incentiveAmountCents,
    );
    const expiryDate = calculateExpiryDate(input.quoteDate, input.validityDays);
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    const statusChanged = current.status !== input.status;
    await tx.quote.update({
      where: { id },
      data: {
        customerId: input.customerId,
        categoryId: input.categoryId || null,
        status: input.status,
        quoteDate: input.quoteDate,
        validityDays: input.validityDays,
        expiryDate,
        seller: input.seller,
        subject: input.subject,
        deliveryTime: input.deliveryTime,
        internalNotes: input.internalNotes,
        customerSnapshot: json(snap.customer),
        categorySnapshot: snap.category ? json(snap.category) : null,
        installationAddressSnapshot: input.installationAddressSnapshot,
        technicalConfiguration: input.technicalConfiguration,
        paymentMethod: input.paymentMethod,
        paymentConditions: input.paymentConditions,
        paymentSchedule: input.paymentSchedule.length
          ? json(input.paymentSchedule)
          : null,
        depositPercent: input.depositPercent,
        depositCents: split.depositCents,
        balancePercent: split.balancePercent,
        balanceCents: split.balanceCents,
        financingAvailable: input.financingAvailable,
        financingType: input.financingType,
        financingNotes: input.financingNotes,
        incentive: input.incentive,
        incentivePercent: input.incentivePercent,
        ...incentive,
        fiscalNote: input.fiscalNote,
        visibleNotes: input.visibleNotes,
        additionalConditions: input.additionalConditions,
        attachmentMode: input.attachmentMode,
        ...totals,
        issuedAt:
          input.status !== "BOZZA" && !current.issuedAt
            ? new Date()
            : current.issuedAt,
        reminders: {
          updateMany: {
            where: { contactedAt: null },
            data: { dueAt: addDays(expiryDate, -5) },
          },
        },
      },
    });
    await tx.quoteItem.createMany({
      data: items.map((item) => ({ ...item, quoteId: id })),
    });
    await tx.quoteAttachmentSelection.deleteMany({ where: { quoteId: id } });
    if (input.attachmentMode === "SELEZIONATE" && input.selectedAttachmentIds.length) {
      await tx.quoteAttachmentSelection.createMany({
        data: input.selectedAttachmentIds.map((attachmentId) => ({ quoteId: id, attachmentId, selected: true })),
      });
    }
    if (statusChanged)
      await tx.quoteStatusHistory.create({
        data: {
          quoteId: id,
          fromStatus: current.status,
          toStatus: input.status,
          note: "Stato modificato durante il salvataggio",
        },
      });
    return tx.quote.findUniqueOrThrow({
      where: { id },
      include: {
        items: { orderBy: { position: "asc" } },
        customer: true,
        category: true,
        statusHistory: true,
      },
    });
  });
}

export async function changeQuoteStatus(
  id: number,
  status: string,
  note?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.quote.findUnique({ where: { id } });
    if (!current) throw new Error("Preventivo non trovato.");
    if (current.status === status) return current;
    const updated = await tx.quote.update({
      where: { id },
      data: {
        status,
        issuedAt:
          status !== "BOZZA" && !current.issuedAt
            ? new Date()
            : current.issuedAt,
      },
    });
    await tx.quoteStatusHistory.create({
      data: { quoteId: id, fromStatus: current.status, toStatus: status, note },
    });
    return updated;
  });
}

export async function duplicateQuote(id: number) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.quote.findUnique({
      where: { id },
      include: { items: true, attachmentSelections: true },
    });
    if (!source) throw new Error("Preventivo non trovato.");
    const quoteDate = new Date();
    const number = await quoteNumber(tx, quoteDate);
    const expiryDate = calculateExpiryDate(quoteDate, source.validityDays);
    const created = await tx.quote.create({
      data: {
        number,
        customerId: source.customerId,
        categoryId: source.categoryId,
        status: "BOZZA",
        quoteDate,
        validityDays: source.validityDays,
        expiryDate,
        seller: source.seller,
        subject: `${source.subject || "Preventivo"} - copia`,
        deliveryTime: source.deliveryTime,
        internalNotes: source.internalNotes,
        installationAddressSnapshot: source.installationAddressSnapshot,
        customerSnapshot: source.customerSnapshot,
        categorySnapshot: source.categorySnapshot,
        technicalConfiguration: source.technicalConfiguration,
        paymentMethod: source.paymentMethod,
        paymentConditions: source.paymentConditions,
        paymentSchedule: source.paymentSchedule,
        depositPercent: source.depositPercent,
        depositCents: source.depositCents,
        balancePercent: source.balancePercent,
        balanceCents: source.balanceCents,
        financingAvailable: source.financingAvailable,
        financingType: source.financingType,
        financingNotes: source.financingNotes,
        incentive: source.incentive,
        incentivePercent: source.incentivePercent,
        incentiveAmountCents: source.incentiveAmountCents,
        netAfterIncentiveCents: source.netAfterIncentiveCents,
        fiscalNote: source.fiscalNote,
        visibleNotes: source.visibleNotes,
        additionalConditions: source.additionalConditions,
        subtotalCents: source.subtotalCents,
        discountCents: source.discountCents,
        vatCents: source.vatCents,
        totalCents: source.totalCents,
        estimatedMarginCents: source.estimatedMarginCents,
        attachmentMode: source.attachmentMode,
        statusHistory: {
          create: { toStatus: "BOZZA", note: `Duplicato da ${source.number}` },
        },
        reminders: { create: { dueAt: addDays(expiryDate, -5) } },
      },
    });
    await tx.quoteItem.createMany({
      data: source.items.map(
        ({ id: _i, quoteId: _q, createdAt: _c, updatedAt: _u, ...rest }) => ({
          ...rest,
          quoteId: created.id,
        }),
      ),
    });
    if (source.attachmentSelections.length) {
      await tx.quoteAttachmentSelection.createMany({
        data: source.attachmentSelections.map((entry) => ({ quoteId: created.id, attachmentId: entry.attachmentId, selected: entry.selected })),
      });
    }
    return tx.quote.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        items: { orderBy: { position: "asc" } },
        customer: true,
        category: true,
      },
    });
  });
}

export async function refreshExpiredQuotes(now = new Date()) {
  const candidates = await prisma.quote.findMany({
    where: { expiryDate: { lt: now }, status: { in: ["EMESSO", "INVIATO"] } },
  });
  for (const quote of candidates) {
    if (shouldAutoExpire(quote.status, quote.expiryDate, now))
      await changeQuoteStatus(
        quote.id,
        "SCADUTO",
        "Scadenza automatica della validità",
      );
  }
  return candidates.length;
}
