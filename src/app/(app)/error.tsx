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
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center flex-1 py-24 text-center gap-4">
      <AlertTriangle size={48} strokeWidth={1} className="text-destructive" />
      <div>
        <p className="text-lg font-medium">משהו השתבש</p>
        <p className="text-sm text-muted-foreground mt-1">
          אירעה שגיאה בטעינת הנתונים. נסו שוב, ואם הבעיה חוזרת פנו למנהל המערכת.
        </p>
      </div>
      <Button onClick={reset}>נסה שוב</Button>
    </div>
  );
}
