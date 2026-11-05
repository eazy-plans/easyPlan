import Link from "next/link";
import { ShieldCheck } from "lucide-react";

interface PrivacyNoticeProps {
  text: string;
  className?: string;
}

/**
 * Short data-collection disclosure shown next to forms that capture personal
 * information (Privacy Protection Law section 11). Links to the full policy.
 */
export function PrivacyNotice({ text, className }: PrivacyNoticeProps) {
  return (
    <div
      className={`rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/80 flex items-start gap-2 ${className ?? ""}`}
      dir="rtl"
    >
      <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
      <p>
        {text}{" "}
        <Link href="/privacy" target="_blank" className="text-primary font-medium underline underline-offset-2 hover:no-underline">
          למדיניות הפרטיות המלאה
        </Link>
      </p>
    </div>
  );
}
