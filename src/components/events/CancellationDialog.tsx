"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertTriangle } from "lucide-react";
import type { EventRow, VenueRow } from "@/types/database";
import { calculateRefund, getPolicyDescription } from "@/lib/cancellation/refundCalculator";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CancellationDialogProps {
  event: EventRow & { venue: VenueRow };
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export function CancellationDialog({
  event,
  open,
  onClose,
  onConfirm,
  isLoading = false,
}: CancellationDialogProps) {
  const [reason, setReason] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refundCalc = calculateRefund(event, event.venue);
  const policyDesc = getPolicyDescription(event.venue.cancellation_policy_type, event.venue);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError("חובה להזין סיבת ביטול");
      return;
    }

    if (!agreed) {
      setError("חובה לאשר את תנאי ההחזר");
      return;
    }

    setError(null);

    try {
      await onConfirm(reason);
      setReason("");
      setAgreed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בביטול ההזמנה");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} />
            ביטול הזמנה
          </DialogTitle>
          <DialogDescription>
            ודא את פרטי הביטול וההחזר לפני המשך
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Event Summary */}
          <div className="rounded-lg bg-gray-50 p-3 space-y-2">
            <p className="text-sm font-medium">פרטי ההזמנה:</p>
            <ul className="text-xs space-y-1 text-gray-700">
              <li>
                <strong>אולם:</strong> {event.venue.name}
              </li>
              <li>
                <strong>תאריך:</strong> {formatDate(event.date)}
              </li>
              <li>
                <strong>לקוח:</strong> {event.client_name}
              </li>
              <li>
                <strong>מחיר:</strong> {formatCurrency(event.original_price_final || event.price_final)}
              </li>
            </ul>
          </div>

          {/* Policy Info */}
          <div className="rounded-lg bg-blue-50 p-3 space-y-2 border border-blue-200">
            <p className="text-sm font-medium text-blue-900">מדיניות ביטול:</p>
            <p className="text-xs text-blue-800">{policyDesc}</p>
          </div>

          {/* Refund Calculation */}
          <div className="rounded-lg bg-green-50 p-3 space-y-2 border border-green-200">
            <p className="text-sm font-medium text-green-900">💰 חישוב החזר:</p>
            <div className="space-y-1 text-xs text-green-800">
              <p>
                <strong>סכום החזר:</strong> {formatCurrency(refundCalc.refundAmount)}
              </p>
              <p>
                <strong>אחוז החזר:</strong> {refundCalc.refundPercent}%
              </p>
              <p className="italic">{refundCalc.message}</p>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm">
              סיבת הביטול *
            </Label>
            <Textarea
              id="reason"
              placeholder="הזן סיבה לביטול ההזמנה (תשלח ללקוח בדוא״ל)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-sm"
              rows={3}
            />
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="agree" className="text-xs text-gray-700 cursor-pointer">
              אני מאשר/מאשרת שאני מודע/מודעת להחזר בסכום של{" "}
              <strong>{formatCurrency(refundCalc.refundAmount)}</strong> ומבין/מבינה את מדיניות הביטול
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle size={16} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            ביטול
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !agreed || !reason.trim()}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                בטיול בתהליך...
              </>
            ) : (
              "אישור ביטול"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
