"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { isValidPhone } from "@/lib/utils";
import type { LeadStatus } from "@/types/database";
import { useRouter } from "next/navigation";

type LeadRow = {
  id: string;
  client_name: string;
  client_phone: string | null;
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

const EMPTY_FORM = { client_name: "", client_phone: "", client_email: "" };

export function LeadsManager({ leads: initialLeads, initialSearch = "" }: LeadsManagerProps) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [searchFilter, setSearchFilter] = useState(initialSearch);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [phoneError, setPhoneError] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);
  const [duplicateLeadId, setDuplicateLeadId] = useState<string | null>(null);

  const filtered = useMemo(() => leads.filter((l) => {
    const searchLower = searchFilter.toLowerCase();
    return !searchFilter ||
      l.client_name.toLowerCase().includes(searchLower) ||
      (l.client_phone ?? "").includes(searchFilter) ||
      (l.client_email ?? "").toLowerCase().includes(searchLower);
  }), [leads, searchFilter]);

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

    const { data, error } = await supabase.from("leads")
      .insert({
        client_name: form.client_name,
        client_phone: form.client_phone || null,
        client_email: form.client_email || null,
        status: "new",
      })
      .select("*, interests:lead_venue_interests(venue:venues(id,name)), inquiries:lead_inquiries(id,status,venue_id)")
      .single();

    setSaving(false);
    if (error) {
      // Unique violation on client_phone - surface the existing lead instead
      // of a dead-end error.
      if (error.code === "23505") {
        const { data: existing } = await supabase.from("leads")
          .select("id")
          .eq("client_phone", form.client_phone)
          .maybeSingle();
        setDuplicateLeadId(existing?.id ?? null);
        if (!existing) toast.error("ליד עם מספר טלפון זה כבר קיים");
        return;
      }
      toast.error("שגיאה בשמירת ליד");
      return;
    }
    setLeads((prev) => [data, ...prev]);
    setForm(EMPTY_FORM);
    setCreatedLeadId(data.id);
    toast.success("הליד נוסף");
    router.refresh();
  }


  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-row gap-2 items-center">
          <Input
            placeholder="חיפוש"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="flex-1 h-9 text-sm"
          />
        </div>
        <Dialog open={addOpen} onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setCreatedLeadId(null);
            setDuplicateLeadId(null);
            setForm(EMPTY_FORM);
            setPhoneError("");
          } else {
            setAddOpen(true);
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-fit">+ ליד חדש</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{duplicateLeadId ? "הליד כבר קיים" : createdLeadId ? "הליד נוסף בהצלחה" : "הוספת ליד חדש"}</DialogTitle>
            </DialogHeader>
            <DialogBody>
            {duplicateLeadId ? (
              <div className="space-y-4 py-4">
                <p className="text-center text-muted-foreground">
                  ליד עם המספר <span dir="ltr">{form.client_phone}</span> כבר קיים במערכת
                </p>
                <div className="flex flex-col gap-3">
                  <Button onClick={() => {
                    setAddOpen(false);
                    router.push(`/leads/${duplicateLeadId}`);
                  }} className="w-full">
                    פתח את הליד הקיים
                  </Button>
                  <Button variant="outline" onClick={() => setDuplicateLeadId(null)} className="w-full">
                    חזרה לטופס
                  </Button>
                </div>
              </div>
            ) : !createdLeadId ? (
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
                <div className="flex gap-3">
                  <Button type="submit" disabled={saving} className="flex-1">{saving ? "שומר..." : "שמור"}</Button>
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>ביטול</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 py-4">
                <p className="text-center text-muted-foreground">הליד {form.client_name} נוסף לרשימה</p>
                <div className="flex flex-col gap-3">
                  <Button onClick={() => {
                    setAddOpen(false);
                    router.push(`/leads/${createdLeadId}`);
                  }} className="w-full">
                    עריכת פרטים
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setCreatedLeadId(null);
                    setForm(EMPTY_FORM);
                    setPhoneError("");
                  }} className="w-full">
                    הוספת ליד נוסף
                  </Button>
                </div>
              </div>
            )}
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
            className="border rounded-lg p-3 hover:bg-muted/50 hover:border-primary/50 transition-colors text-right h-28"
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

