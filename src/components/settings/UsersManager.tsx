/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { inviteUser } from "@/app/actions/invite-user";
import { setUserAccess } from "@/app/actions/user-access";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "מנהל",
  secretary: "מזכירה",
  venue_owner: "בעל אולם",
};

const ROLE_VARIANT: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  secretary: "secondary",
  venue_owner: "outline",
};

type UserRow = { id: string; email: string; full_name: string; role: UserRole; created_at: string; blocked: boolean };

interface UsersManagerProps {
  users: UserRow[];
  currentUserId: string;
}

function BlockAccessConfirm({ user, loading, onConfirm, className }: { user: UserRow; loading: boolean; onConfirm: () => void; className?: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className={`text-destructive ${className ?? ""}`} disabled={loading}>
          {loading ? "חוסם..." : "חסום גישה"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>חסימת גישה למערכת</AlertDialogTitle>
          <AlertDialogDescription>
            {user.full_name} ({user.email}) לא יוכל/תוכל יותר להתחבר למערכת. הנתונים לא יימחקו וניתן לשחזר את הגישה בכל עת.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-white hover:bg-destructive/90">
            חסום גישה
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function UsersManager({ users: initialUsers, currentUserId }: UsersManagerProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  useEffect(() => { setUsers(initialUsers); }, [initialUsers]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "", role: "secretary" as UserRole, password: "" });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "secretary" as UserRole });
  const [editLoading, setEditLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accessLoading, setAccessLoading] = useState<string | null>(null);

  async function toggleAccess(u: UserRow) {
    setAccessLoading(u.id);
    const result = await setUserAccess(u.id, !u.blocked);
    setAccessLoading(null);

    if (result.error) { toast.error("שגיאה בעדכון הגישה: " + result.error); return; }

    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, blocked: !u.blocked } : x)));
    toast.success(u.blocked ? "הגישה שוחזרה" : "הגישה נחסמה");
    router.refresh();
  }

  function openEdit(u: UserRow) {
    setEditForm({ full_name: u.full_name, role: u.role });
    setEditUser(u);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditLoading(true);
    const supabase = createClient();

    const { error } = await (supabase.from("users") as any)
      .update({ full_name: editForm.full_name, role: editForm.role })
      .eq("id", editUser.id);
    setEditLoading(false);

    if (error) { toast.error("שגיאה בשמירת הפרטים"); return; }

    setUsers((prev) => prev.map((u) =>
      u.id === editUser.id ? { ...u, full_name: editForm.full_name, role: editForm.role } : u
    ));
    toast.success("הפרטים עודכנו");
    setEditUser(null);
    router.refresh();
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLoading(true);
    const result = await inviteUser(inviteForm.email, inviteForm.full_name, inviteForm.role, inviteForm.password);
    setInviteLoading(false);

    if (result.error) { toast.error("שגיאה ביצירת משתמש: " + result.error); return; }

    if (!inviteForm.email.trim() && result.email) {
      toast.success(`המשתמש נוצר בהצלחה. אימייל להתחברות: ${result.email}`, { duration: 12000 });
    } else {
      toast.success("המשתמש נוצר בהצלחה.");
    }
    setInviteOpen(false);
    setInviteForm({ email: "", full_name: "", role: "secretary", password: "" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת משתמש</DialogTitle>
          </DialogHeader>
          <DialogBody>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1">
              <Label>שם מלא *</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>אימייל</Label>
              <Input value={editUser?.email ?? ""} dir="ltr" disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">לא ניתן לשנות אימייל מכאן</p>
            </div>
            <div className="space-y-1">
              <Label>תפקיד *</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as UserRole }))}
                disabled={editUser?.id === currentUserId}
              >
                <SelectTrigger dir="rtl"><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editUser?.id === currentUserId && (
                <p className="text-xs text-muted-foreground">לא ניתן לשנות את התפקיד שלך</p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={editLoading} className="flex-1">
                {editLoading ? "שומר..." : "שמור שינויים"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>ביטול</Button>
            </div>
          </form>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{users.length} משתמשים</p>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>הוסף משתמש</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>הוספת משתמש חדש</DialogTitle>
            </DialogHeader>
            <DialogBody>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1">
                <Label>שם מלא *</Label>
                <Input
                  value={inviteForm.full_name}
                  onChange={(e) => setInviteForm((f) => ({ ...f, full_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>אימייל</Label>
                <Input
                  type="email"
                  dir="ltr"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">אפשר להשאיר ריק — תיווצר כתובת ברירת מחדל להתחברות.</p>
              </div>
              <div className="space-y-1">
                <Label>תפקיד *</Label>
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v as UserRole }))}>
                  <SelectTrigger dir="rtl"><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>סיסמה *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    value={inviteForm.password}
                    onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    minLength={8}
                    placeholder="לפחות 8 תווים"
                    className="pl-9"
                  />
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">העבר/י את הסיסמה למשתמש באופן ידני.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={inviteLoading} className="flex-1">
                  {inviteLoading ? "יוצר..." : "צור משתמש"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>ביטול</Button>
              </div>
            </form>
            </DialogBody>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table (desktop) */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground sticky top-0 z-10">
            <tr>
              <th className="text-right px-4 py-3 font-medium">שם</th>
              <th className="text-right px-4 py-3 font-medium">אימייל</th>
              <th className="text-right px-4 py-3 font-medium">תפקיד</th>
              <th className="text-right px-4 py-3 font-medium">נוצר</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3 font-medium">
                  {u.full_name}
                  {u.id === currentUserId && <span className="text-xs text-muted-foreground mr-2">(אתה)</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground" dir="ltr">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                    {u.blocked && <Badge variant="destructive">הגישה חסומה</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(new Date(u.created_at))}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(u)}>ערוך</Button>
                    {u.id !== currentUserId && (
                      u.blocked ? (
                        <Button size="sm" variant="outline" onClick={() => toggleAccess(u)} disabled={accessLoading === u.id}>
                          {accessLoading === u.id ? "משחזר..." : "שחזר גישה"}
                        </Button>
                      ) : (
                        <BlockAccessConfirm user={u} loading={accessLoading === u.id} onConfirm={() => toggleAccess(u)} />
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-3">
        {users.map((u) => (
          <div key={u.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {u.full_name}
                  {u.id === currentUserId && <span className="text-xs text-muted-foreground mr-1">(אתה)</span>}
                </p>
                <p className="text-sm text-muted-foreground" dir="ltr">{u.email}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                {u.blocked && <Badge variant="destructive">הגישה חסומה</Badge>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(u)}>ערוך</Button>
              {u.id !== currentUserId && (
                u.blocked ? (
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => toggleAccess(u)} disabled={accessLoading === u.id}>
                    {accessLoading === u.id ? "משחזר..." : "שחזר גישה"}
                  </Button>
                ) : (
                  <BlockAccessConfirm user={u} loading={accessLoading === u.id} onConfirm={() => toggleAccess(u)} className="flex-1" />
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
