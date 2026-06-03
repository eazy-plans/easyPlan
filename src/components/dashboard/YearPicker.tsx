"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface YearPickerProps {
  year: number;
}

export function YearPicker({ year }: YearPickerProps) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  function go(delta: number) {
    router.push(`/dashboard?year=${year + delta}`);
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => go(-1)} aria-label="שנה קודמת">
        <ChevronRight size={16} />
      </Button>
      <span className="text-sm font-semibold w-12 text-center tabular-nums">{year}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => go(1)}
        disabled={year >= currentYear}
        aria-label="שנה הבאה"
      >
        <ChevronLeft size={16} />
      </Button>
    </div>
  );
}
