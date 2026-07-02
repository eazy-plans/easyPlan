"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowRight className="h-4 w-4" />
      חזור
    </button>
  );
}
