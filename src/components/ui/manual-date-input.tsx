"use client";

import { useState } from "react";
import { CalendarPlus, AlertCircle } from "lucide-react";
import { cn, parseManualDate } from "@/lib/utils";

interface ManualDateInputProps {
  /** Called with a valid, parsed date once it also clears `disabled`. */
  onSubmit: (date: Date) => void;
  /** Same predicate passed to the adjacent calendar's `disabled` prop, so a
      manually typed date is held to the same availability rules. */
  disabled?: (date: Date) => boolean;
  className?: string;
}

export function ManualDateInput({ onSubmit, disabled, className }: ManualDateInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseManualDate(value);
    if (!parsed) { setError("תאריך לא תקין (פורמט: DD/MM/YYYY)"); return; }
    if (disabled?.(parsed)) { setError("התאריך הזה אינו זמין"); return; }
    setError("");
    setValue("");
    onSubmit(parsed);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("shrink-0", className)}>
      <div className="inline-flex items-stretch h-9 rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-shadow">
        <button
          type="submit"
          className="px-3 text-sm font-medium text-primary border-l border-input hover:bg-accent transition-colors shrink-0"
        >
          אישור
        </button>
        <span className="flex items-center pl-1.5 pr-2.5 text-muted-foreground shrink-0">
          <CalendarPlus size={14} />
        </span>
        <input
          type="text"
          dir="ltr"
          inputMode="numeric"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(""); }}
          placeholder="DD/MM/YYYY"
          className="w-[102px] bg-transparent pl-2 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive mt-1.5" dir="rtl">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </p>
      )}
    </form>
  );
}
