import type { LeadInquiryStatus } from "./database";

export const INQUIRY_STATUS_LABELS: Record<LeadInquiryStatus, string> = {
  considering: "בשיקול",
  too_expensive: "יקר מדי",
  not_relevant: "לא רלוונטי",
  not_interested: "לא מעוניין",
  booked: "הוזמן",
  cancelled: "בוטל",
  other: "אחר",
};

export const INQUIRY_STATUSES: LeadInquiryStatus[] = [
  "considering",
  "too_expensive",
  "not_relevant",
  "not_interested",
  "booked",
  "cancelled",
  "other",
];

/** Statuses whose free-text field reads as a rejection reason; for the rest it's a plain note. */
export const REJECTION_STATUSES: LeadInquiryStatus[] = [
  "too_expensive",
  "not_relevant",
  "not_interested",
  "cancelled",
];

export const INQUIRY_STATUS_VARIANT: Record<
  LeadInquiryStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  considering: "secondary",
  too_expensive: "outline",
  not_relevant: "outline",
  not_interested: "outline",
  booked: "default",
  cancelled: "destructive",
  other: "secondary",
};
