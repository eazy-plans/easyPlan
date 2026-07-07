-- ============================================================
-- Simplify venue cancellation policy to a single free-text field
-- ============================================================

ALTER TABLE venues ADD COLUMN cancellation_policy text;

-- Backfill from the old structured policy so existing venues keep
-- a human-readable description of what they had configured.
UPDATE venues SET cancellation_policy = CASE cancellation_policy_type
  WHEN 'flexible' THEN
    'החזר מלא בביטול עד ' || cancellation_deadline_days || ' ימים מההזמנה. לאחר מכן אין החזר.'
  WHEN 'moderate' THEN
    'החזר מדורג לפי מועד הביטול: 100% עד 30 ימים לפני האירוע, 50% בין 14-30 ימים, 25% בין 7-14 ימים, ללא החזר בפחות מ-7 ימים.'
  WHEN 'strict' THEN
    'עמלת ביטול של ' || trim(trailing '.' from trim(trailing '0' from cancellation_fee_percent::text)) ||
    '%. יתרת הסכום מוחזרת בביטול עד ' || cancellation_deadline_days || ' ימים מההזמנה. לאחר מכן אין החזר.'
  WHEN 'custom' THEN refund_details
END;

ALTER TABLE venues
  DROP CONSTRAINT IF EXISTS check_cancellation_fee_percent,
  DROP CONSTRAINT IF EXISTS check_cancellation_deadline_days,
  DROP CONSTRAINT IF EXISTS check_custom_policy_details;

ALTER TABLE venues
  DROP COLUMN cancellation_policy_type,
  DROP COLUMN cancellation_deadline_days,
  DROP COLUMN cancellation_fee_percent,
  DROP COLUMN refund_details;

DROP TYPE cancellation_policy_type;
