import type { EventRow, VenueRow, RefundCalculation, CancellationPolicyType } from "@/types/database";
import { parseISO, differenceInDays } from "date-fns";

export function calculateRefund(
  event: EventRow,
  venue: VenueRow,
  cancellationDate: Date = new Date()
): RefundCalculation {
  if (!event.booking_date || !event.original_price_final) {
    return {
      refundAmount: 0,
      refundPercent: 0,
      policyApplied: venue.cancellation_policy_type,
      daysBeforeDeadline: 0,
      message: "Cannot calculate refund: missing booking date or original price",
    };
  }

  const bookingDate = parseISO(event.booking_date);
  const eventDate = parseISO(event.date);
  const deadline = new Date(bookingDate);
  deadline.setDate(deadline.getDate() + venue.cancellation_deadline_days);

  const daysBeforeDeadline = differenceInDays(deadline, cancellationDate);
  const originalPrice = event.original_price_final;

  let refundPercent = 0;
  let message = "";

  switch (venue.cancellation_policy_type) {
    case "flexible":
      if (cancellationDate <= deadline) {
        refundPercent = 100;
        message = `מדיניות גמישה: החזר מלא עד ${venue.cancellation_deadline_days} ימים`;
      } else {
        refundPercent = 0;
        message = `מדיניות גמישה: לא קיימת החזר מחוץ לתקופה`;
      }
      break;

    case "moderate":
      if (daysBeforeDeadline >= 30) {
        refundPercent = 100;
        message = `מדיניות מתונה: 100% החזר עד 30 ימים`;
      } else if (daysBeforeDeadline >= 14) {
        refundPercent = 50;
        message = `מדיניות מתונה: 50% החזר בין 14-30 ימים`;
      } else if (daysBeforeDeadline >= 7) {
        refundPercent = 25;
        message = `מדיניות מתונה: 25% החזר בין 7-14 ימים`;
      } else {
        refundPercent = 0;
        message = `מדיניות מתונה: אין החזר תוך 7 ימים לאירוע`;
      }
      break;

    case "strict":
      const nonRefundableFee = venue.cancellation_fee_percent;
      const refundablePercent = 100 - nonRefundableFee;

      if (cancellationDate <= deadline) {
        refundPercent = refundablePercent;
        message = `מדיניות קשוחה: ${refundablePercent}% החזר (${nonRefundableFee}% עמלה אי-החזר)`;
      } else {
        refundPercent = 0;
        message = `מדיניות קשוחה: אין החזר אחרי התאריך הקבוע`;
      }
      break;

    case "custom":
      // For custom policies, default to 0 and let manual review happen
      refundPercent = 0;
      message = `מדיניות מותאמת אישית: נדרשת בדיקה ידנית. ${venue.refund_details}`;
      break;
  }

  const refundAmount = Math.round((originalPrice * refundPercent) / 100 * 100) / 100;

  return {
    refundAmount,
    refundPercent,
    policyApplied: venue.cancellation_policy_type,
    daysBeforeDeadline,
    message,
  };
}

export function isWithinCancellationDeadline(
  event: EventRow,
  venue: VenueRow,
  checkDate: Date = new Date()
): boolean {
  if (!event.booking_date) return false;

  const bookingDate = parseISO(event.booking_date);
  const deadline = new Date(bookingDate);
  deadline.setDate(deadline.getDate() + venue.cancellation_deadline_days);

  return checkDate <= deadline;
}

export function getPolicyDescription(policyType: CancellationPolicyType, venue?: VenueRow): string {
  const baseMessages: Record<CancellationPolicyType, string> = {
    flexible: "מדיניות גמישה: החזר מלא אם מבוטל לפני תאריך הקבוע",
    moderate: "מדיניות מתונה: החזר בדרגות (100% → 50% → 25% → 0%) לפי מספר הימים",
    strict: "מדיניות קשוחה: עמלה קבועה, החזר של היתרה עד לתאריך הקבוע",
    custom: "מדיניות מותאמת אישית",
  };

  let description = baseMessages[policyType];

  if (venue) {
    description += ` (תאריך קבוע: ${venue.cancellation_deadline_days} ימים)`;

    if (policyType === "strict" || policyType === "moderate") {
      description += ` (עמלה: ${venue.cancellation_fee_percent}%)`;
    }

    if (policyType === "custom" && venue.refund_details) {
      description += `: ${venue.refund_details}`;
    }
  }

  return description;
}

export function getDeadlineDate(event: EventRow, venue: VenueRow): Date {
  if (!event.booking_date) {
    return new Date(); // Fallback, shouldn't happen in practice
  }

  const bookingDate = parseISO(event.booking_date);
  const deadline = new Date(bookingDate);
  deadline.setDate(deadline.getDate() + venue.cancellation_deadline_days);

  return deadline;
}
