import Link from "next/link";
import type { Metadata } from "next";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "הדף לא נמצא" };

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileQuestion size={28} strokeWidth={1.5} />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">הדף לא נמצא</h1>
          <p className="text-sm text-muted-foreground">
            הכתובת שניסית להגיע אליה לא קיימת, או שהוסרה.
          </p>
        </div>
        <Button asChild className="mt-2">
          <Link href="/">חזרה לדף הבית</Link>
        </Button>
      </div>
    </main>
  );
}
