"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logAudit } from "@/lib/audit";

interface MyAccountSettingsProps {
  userId: string;
  email: string;
  fullName: string;
}

// Minimal per-role settings (G2/G3): secretary and venue_owner get their own
// display name + password, not the admin user-management screen.
export function MyAccountSettings({ userId, email, fullName: initialFullName }: MyAccountSettingsProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [savingName, setSavingName] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { toast.error("יש להזין שם"); return; }
    setSavingName(true);
    const supabase = createClient();
    const { error } = await supabase.from("users").update({ full_name: fullName.trim() }).eq("id", userId);
    setSavingName(false);
    if (error) { toast.error("שגיאה בעדכון השם"); return; }
    logAudit(supabase, userId, "user.update", "user", userId, { full_name: { from: initialFullName, to: fullName.trim() } });
    toast.success("השם עודכן");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("הסיסמה חייבת להכיל לפחות 6 תווים"); return; }
    if (password !== confirmPassword) { toast.error("הסיסמאות אינן תואמות"); return; }
    setSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) { toast.error("שגיאה בעדכון הסיסמה: " + error.message); return; }
    logAudit(supabase, userId, "user.password_change", "user", userId);
    setPassword("");
    setConfirmPassword("");
    toast.success("הסיסמה עודכנה");
  }

  return (
    <div className="max-w-md space-y-6">
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base font-semibold">פרטים אישיים</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="space-y-1">
              <Label>אימייל</Label>
              <Input value={email} disabled dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label>שם מלא</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <Button type="submit" disabled={savingName}>{savingName ? "שומר..." : "שמור שם"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base font-semibold">שינוי סיסמה</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1">
              <Label>סיסמה חדשה</Label>
              <Input type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>אימות סיסמה</Label>
              <Input type="password" dir="ltr" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={savingPassword}>{savingPassword ? "מעדכן..." : "עדכן סיסמה"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
