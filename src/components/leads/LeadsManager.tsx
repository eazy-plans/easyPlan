/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { isValidPhone } from "@/lib/utils";
import type { LeadStatus } from "@/types/database";
import { useRouter } from "next/navigation";

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "חדש",
  considering: "שוקל/ת",
  waiting_for_date: "ממתין/ה לתאריך",
  date_taken: "תאריך תפוס",
  booked: "הוזמן",
  cancelled: "בוטל",
  too_expensive: "יקר מדי",
  not_relevant: "לא רלוונטי",
};

const STATUS_VARIANT: Record<LeadStatus, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  considering: "secondary",
  waiting_for_date: "secondary",
  date_taken: "outline",
  booked: "default",
  cancelled: "destructive",
  too_expensive: "outline",
  not_relevant: "outline",
};

type LeadRow = {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

interface LeadsManagerProps {
  leads: LeadRow[];
  initialSearch?: string;
}

const EMPTY_FORM = { client_name: "", client_phone: "", client_email: "", notes: "", status: "new" as LeadStatus };

export function LeadsManager({ leads: initialLeads, initialSearch = "" }: LeadsManagerProps) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [searchFilter, setSearchFilter] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [phoneError, setPhoneError] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => leads.filter((l) => {
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const searchLower = searchFilter.toLowerCase();
    const matchSearch = !searchFilter ||
      l.client_name.toLowerCase().includes(searchLower) ||
      l.client_phone.includes(searchFilter) ||
      (l.client_email ?? "").toLowerCase().includes(searchLower);
    return matchStatus && matchSearch;
  }), [leads, searchFilter, statusFilter]);

  function setF(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "client_phone") setPhoneError("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (form.client_phone && !isValidPhone(form.client_phone)) {
      setPhoneError("מספר טלפון לא תקין (לדוגמה: 052-1234567)");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const { data, error } = await (supabase.from("leads") as any)
      .insert({
        client_name: form.client_name,
        client_phone: form.client_phone,
        client_email: form.client_email || null,
        notes: form.notes || null,
        status: form.status,
      })
      .select("*, interests:lead_venue_interests(venue:venues(id,name)), inquiries:lead_inquiries(id,status,venue_id)")
      .single();

    setSaving(false);
    if (error) { toast.error("שגיאה בשמירת ליד"); return; }
    setLeads((prev) => [data, ...prev]);
    setForm(EMPTY_FORM);
    setAddOpen(false);
    toast.success("הליד נוסף");
    router.refresh();
  }


  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-row gap-2 items-center">
          <Input
            placeholder="חיפוש לפי שם, טלפון או מייל"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="flex-1 h-9 text-sm"
          />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | "all")}>
            <SelectTrigger dir="rtl" className="flex-none w-40 h-9 text-sm">
              <SelectValue placeholder="כל הסטטוסים" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              {(Object.entries(STATUS_LABELS) as [LeadStatus, string][]).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-fit">+</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>הוספת ליד חדש</DialogTitle>
            </DialogHeader>
            <DialogBody>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1">
                <Label>שם לקוח *</Label>
                <Input value={form.client_name} onChange={(e) => setF("client_name", e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>טלפון</Label>
                <Input type="tel" dir="ltr" value={form.client_phone} onChange={(e) => setF("client_phone", e.target.value)} className={phoneError ? "border-destructive" : ""} placeholder="052-1234567" />
                {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
              </div>
              <div className="space-y-1">
                <Label>מייל</Label>
                <Input type="email" dir="ltr" value={form.client_email} onChange={(e) => setF("client_email", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>סטטוס</Label>
                <Select value={form.status} onValueChange={(v) => setF("status", v)}>
                  <SelectTrigger dir="rtl"><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl">
                    {(Object.entries(STATUS_LABELS) as [LeadStatus, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>הערות</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => setF("notes", e.target.value)} />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={saving} className="flex-1">{saving ? "שומר..." : "שמור"}</Button>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>ביטול</Button>
              </div>
            </form>
            </DialogBody>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} לידים</p>

      {/* Lead cards grid */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-16 sm:pb-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" dir="rtl">
        {filtered.length === 0 && (
          <p className="text-center py-10 text-muted-foreground col-span-full">אין לידים תואמים</p>
        )}
        {filtered.map((lead) => (
          <button
            key={lead.id}
            onClick={() => router.push(`/leads/${lead.id}`)}
            className="border rounded-lg p-3 hover:bg-muted/50 hover:border-primary/50 transition-colors text-right h-fit"
            dir="rtl"
          >
            <div className="space-y-1">
              <p className="font-semibold text-sm truncate">{lead.client_name}</p>
              {lead.client_phone && <p className="text-xs text-muted-foreground truncate" dir="ltr">{lead.client_phone}</p>}
              {lead.client_email && <p className="text-xs text-muted-foreground truncate" dir="ltr">{lead.client_email}</p>}
            </div>
          </button>
        ))}
      </div>
      </div>

      {/* Mobile floating action button */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="sm:hidden fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl hover:bg-primary/90 active:scale-95 transition-all"
        aria-label="ליד חדש"
      >
        +
      </button>
    </div>
  );
}

