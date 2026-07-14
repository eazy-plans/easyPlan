-- ============================================================
-- Drop obsolete refund_date-on-cancellation constraint
-- ============================================================
-- 014 added CHECK (cancelled_at IS NULL OR refund_date IS NOT NULL),
-- i.e. every cancelled event must record a refund_date. Since 023,
-- refunds are settled manually per the venue's free-text cancellation
-- policy and the cancel API no longer writes refund_date, so this
-- constraint rejects every cancellation. The refund_amount/refund_date
-- columns stay: old cancellations still display their historical values.

ALTER TABLE events DROP CONSTRAINT IF EXISTS check_refund_date_with_cancellation;
