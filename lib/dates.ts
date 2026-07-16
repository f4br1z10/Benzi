import { addDays, differenceInCalendarDays, endOfDay, startOfDay } from "date-fns";

export const calculateExpiryDate = (quoteDate: Date | string, validityDays: number) =>
  addDays(startOfDay(new Date(quoteDate)), Math.max(0, validityDays));

export const daysUntil = (date: Date | string, now = new Date()) =>
  differenceInCalendarDays(startOfDay(new Date(date)), startOfDay(now));

export const isExpired = (expiryDate: Date | string, now = new Date()) =>
  endOfDay(new Date(expiryDate)) < now;

export const shouldAutoExpire = (status: string, expiryDate: Date | string, now = new Date()) =>
  !["BOZZA", "ACCETTATO", "RIFIUTATO", "ANNULLATO", "SCADUTO"].includes(status) && isExpired(expiryDate, now);

export const isReminderDue = (expiryDate: Date | string, now = new Date()) => {
  const days = daysUntil(expiryDate, now);
  return days >= 0 && days <= 5;
};
