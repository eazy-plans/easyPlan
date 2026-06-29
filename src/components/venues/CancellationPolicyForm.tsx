"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CancellationPolicyType } from "@/types/database";
import { getPolicyDescription } from "@/lib/cancellation/refundCalculator";

interface CancellationPolicyFormProps {
  policyType: CancellationPolicyType;
  deadlineDays: number;
  feePercent: number;
  refundDetails: string | null;
  onChange: (data: {
    policyType: CancellationPolicyType;
    deadlineDays: number;
    feePercent: number;
    refundDetails: string | null;
  }) => void;
}

const POLICY_OPTIONS: { value: CancellationPolicyType; label: string; description: string }[] = [
  {
    value: "flexible",
    label: "גמישה - החזר מלא",
    description: "החזר 100% אם מבוטל לפני תאריך הקבוע",
  },
  {
    value: "moderate",
    label: "מתונה - בדרגות",
    description: "100% → 50% → 25% → 0% לפי ימים לפני האירוע",
  },
  {
    value: "strict",
    label: "קשוחה - עם עמלה",
    description: "עמלה קבועה, החזר של היתרה עד לתאריך הקבוע",
  },
  {
    value: "custom",
    label: "מותאמת אישית",
    description: "הגדרה של תנאים משלך",
  },
];

export function CancellationPolicyForm({
  policyType,
  deadlineDays,
  feePercent,
  refundDetails,
  onChange,
}: CancellationPolicyFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePolicyTypeChange = (newType: CancellationPolicyType) => {
    const newErrors: Record<string, string> = {};

    if (newType === "custom" && !refundDetails) {
      newErrors.refundDetails = "חובה להגדיר פרטי מדיניות עבור מדיניות מותאמת";
    }

    setErrors(newErrors);
    onChange({
      policyType: newType,
      deadlineDays,
      feePercent,
      refundDetails,
    });
  };

  const handleDeadlineDaysChange = (value: string) => {
    const days = parseInt(value, 10);
    const newErrors = { ...errors };

    if (isNaN(days) || days <= 0) {
      newErrors.deadlineDays = "מספר הימים חייב להיות חיובי";
    } else {
      delete newErrors.deadlineDays;
    }

    setErrors(newErrors);
    onChange({
      policyType,
      deadlineDays: days,
      feePercent,
      refundDetails,
    });
  };

  const handleFeePercentChange = (value: string) => {
    const percent = parseFloat(value);
    const newErrors = { ...errors };

    if (isNaN(percent) || percent < 0 || percent > 100) {
      newErrors.feePercent = "אחוז העמלה חייב להיות בין 0 ל-100";
    } else {
      delete newErrors.feePercent;
    }

    setErrors(newErrors);
    onChange({
      policyType,
      deadlineDays,
      feePercent: percent,
      refundDetails,
    });
  };

  const handleRefundDetailsChange = (value: string) => {
    const newErrors = { ...errors };

    if (policyType === "custom" && !value.trim()) {
      newErrors.refundDetails = "חובה להגדיר פרטי מדיניות עבור מדיניות מותאמת";
    } else {
      delete newErrors.refundDetails;
    }

    setErrors(newErrors);
    onChange({
      policyType,
      deadlineDays,
      feePercent,
      refundDetails: value || null,
    });
  };

  const selectedPolicy = POLICY_OPTIONS.find((p) => p.value === policyType);

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="policy-type" className="text-sm font-medium">
          סוג מדיניות ביטול
        </Label>
        <Select value={policyType} onValueChange={handlePolicyTypeChange}>
          <SelectTrigger id="policy-type" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POLICY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col gap-1">
                  <span>{option.label}</span>
                  <span className="text-xs text-gray-500">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPolicy && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          <strong>תיאור המדיניות:</strong> {selectedPolicy.description}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="deadline-days" className="text-sm font-medium">
            תאריך קבוע לביטול (ימים)
          </Label>
          <Input
            id="deadline-days"
            type="number"
            min="1"
            value={deadlineDays}
            onChange={(e) => handleDeadlineDaysChange(e.target.value)}
            className="mt-1"
            placeholder="7"
          />
          {errors.deadlineDays && (
            <p className="mt-1 text-xs text-red-600">{errors.deadlineDays}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            מספר הימים מ-הזמנה שבהם ניתן להשיג החזר מלא
          </p>
        </div>

        {(policyType === "strict" || policyType === "moderate") && (
          <div>
            <Label htmlFor="fee-percent" className="text-sm font-medium">
              אחוז עמלה / הנחה ({policyType === "strict" ? "עמלה" : "הנחה"}
              )
            </Label>
            <div className="relative mt-1">
              <Input
                id="fee-percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={feePercent}
                onChange={(e) => handleFeePercentChange(e.target.value)}
                placeholder="20"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
            {errors.feePercent && (
              <p className="mt-1 text-xs text-red-600">{errors.feePercent}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {policyType === "strict"
                ? "אחוז עמלה שאינה מוחזרת אם מבוטל לפני הקבוע"
                : "אחוז ההנחה לטיוב התיכוניות"}
            </p>
          </div>
        )}
      </div>

      {policyType === "custom" && (
        <div>
          <Label htmlFor="refund-details" className="text-sm font-medium">
            פרטי מדיניות מותאמת *
          </Label>
          <Textarea
            id="refund-details"
            value={refundDetails || ""}
            onChange={(e) => handleRefundDetailsChange(e.target.value)}
            placeholder="תאר את תנאי הביטול והחזר המותאמים לאולם שלך..."
            className="mt-1"
            rows={4}
          />
          {errors.refundDetails && (
            <p className="mt-1 text-xs text-red-600">{errors.refundDetails}</p>
          )}
        </div>
      )}

      {policyType !== "custom" && (
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-600">דוגמה לתנאים:</p>
          <p className="mt-2 text-xs text-gray-700">
            {getPolicyDescription(policyType, {
              cancellation_policy_type: policyType,
              cancellation_deadline_days: deadlineDays,
              cancellation_fee_percent: feePercent,
              refund_details: null,
            } as any)}
          </p>
        </div>
      )}
    </div>
  );
}
