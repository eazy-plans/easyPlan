"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertTriangle } from "lucide-react";
import type { EventRow, VenueRow } from "@/types/database";
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

  const policyDesc = event.venue.cancellation_policy?.trim() || "לא הוגדרה מדיניות ביטול לאולם זה. לפרטים יש לפנות לאולם.";

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
        </DialogHeader>

        <DialogBody className="space-y-4">
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
            <p className="text-xs text-blue-800 whitespace-pre-wrap">{policyDesc}</p>
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm">
              סיבת הביטול *
            </Label>
            <Textarea
              id="reason"
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
              אני מאשר/ת שקראתי ואני מבין/ה את מדיניות הביטול של האולם
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle size={16} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              חזרה
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isLoading || !agreed || !reason.trim()}
              className="flex-1"
            >
              {isLoading ? (
                  <Loader2 size={16} className="ml-2 animate-spin" />
              ) : (
                "אישור"
              )}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
