"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ROLE_HOME } from "@/lib/role-home";
import type { UserRole } from "@/types/database";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("מייל או סיסמה שגויים");
      setLoading(false);
      return;
    }

    // Fetch role to redirect correctly
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single() as { data: { role: string } | null };

    router.push(ROLE_HOME[(profile?.role as UserRole) ?? "secretary"]);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground p-12">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-black/10" />
        <div className="absolute top-1/3 left-1/4 w-40 h-40 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm text-xl font-bold">
            E
          </span>
          <span className="text-2xl font-bold">Eazyplans</span>
        </div>
        <div className="relative space-y-4">
          <p className="text-4xl xl:text-5xl font-bold leading-[1.15]">
            ניהול אולמות אירועים,
            <br />
            במקום אחד.
          </p>
          <p className="text-primary-foreground/80 text-base max-w-md">
            יומן, הזמנות, לידים וניהול אולמות — כל מה שצריך כדי להריץ עסק אירועים בלי בלגן.
          </p>
        </div>
        <p className="relative text-xs text-primary-foreground/60">© {new Date().getFullYear()} Eazyplans</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-canvas px-4 py-12">
        <Card className="w-full max-w-sm shadow-xl border-0 ring-1 ring-border">
          <CardHeader className="text-center space-y-2 pb-2">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground lg:hidden">
              E
            </span>
            <CardTitle className="text-2xl font-bold tracking-tight">ברוכים השבים</CardTitle>
            <CardDescription>התחברות למערכת ניהול האולמות</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label htmlFor="email">מייל</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  dir="ltr"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "מתחבר..." : "התחבר"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
