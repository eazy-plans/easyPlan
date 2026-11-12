"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Route-level error boundary. Server components throw on query failures
// instead of rendering misleading empty states - those errors land here.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Full error details (including any message that slipped through from a
    // server throw) stay in the dev console only - production users and the
    // browser's prod console only ever see the generic text below plus digest.
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 py-24 text-center gap-4">
      <AlertTriangle size={48} strokeWidth={1} className="text-destructive" />
      <div>
        <p className="text-lg font-medium">משהו השתבש</p>
        <p className="text-sm text-muted-foreground mt-1">
          אירעה שגיאה בטעינת הנתונים. נסו שוב, ואם הבעיה חוזרת פנו למנהל המערכת.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mt-2">קוד שגיאה: {error.digest}</p>
        )}
      </div>
      <Button onClick={reset}>נסה שוב</Button>
    </div>
  );
}
