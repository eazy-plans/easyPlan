"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { EVENT_TYPE_LABELS } from "@/types/booking";
import type { EventType } from "@/types/database";

interface Step2Props {
  date: Date;
  eventType: EventType;
  city: string;
  neighborhood: string;
  minCapacity: string;
  maxPrice: string;
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  onBack: () => void;
  loading: boolean;
}

export function Step2Filters({
  date, eventType, city, neighborhood, minCapacity, maxPrice,
  onChange, onNext, onBack, loading,
}: Step2Props) {
  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 space-y-6">
        {/* Summary */}
        <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
          <div className="flex gap-2">
            <span className="text-muted-foreground w-20">תאריך:</span>
            <span className="font-medium">{formatDate(date)}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-20">סוג אירוע:</span>
            <span className="font-medium">{EVENT_TYPE_LABELS[eventType]}</span>
          </div>
        </div>

        <div className="space-y-4" dir="rtl">
          <Label className="text-base font-semibold">סינון אולמות</Label>

          <div className="grid grid-cols-2 gap-4" dir="rtl">
            <div className="space-y-1" dir="rtl">
              <Label htmlFor="city">עיר</Label>
              <Input
                id="city"
                placeholder="כל הערים"
                value={city}
                onChange={(e) => onChange("city", e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="space-y-1" dir="rtl">
              <Label htmlFor="neighborhood">שכונה</Label>
              <Input
                id="neighborhood"
                placeholder="כל השכונות"
                value={neighborhood}
                onChange={(e) => onChange("neighborhood", e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="minCapacity">מינימום אורחים</Label>
              <Input
                id="minCapacity"
                type="number"
                min="0"
                placeholder="ללא הגבלה"
                value={minCapacity}
                onChange={(e) => onChange("minCapacity", e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxPrice">מחיר מקסימלי (₪)</Label>
              <Input
                id="maxPrice"
                type="number"
                min="0"
                step="1000"
                placeholder="ללא הגבלה"
                value={maxPrice}
                onChange={(e) => onChange("maxPrice", e.target.value)}
                dir="rtl"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-background pt-3 pb-1">
        <div className="flex gap-3">
          <Button onClick={onNext} disabled={loading} className="flex-1">
            {loading ? "מחפש..." : "חפש אולמות פנויים"}
          </Button>
          <Button variant="outline" onClick={onBack}>חזור</Button>
        </div>
      </div>
    </div>
  );
}
