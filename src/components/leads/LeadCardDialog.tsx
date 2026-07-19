"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Mail, ArrowLeft } from "lucide-react";

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-500",
  "from-pink-500 to-rose-600",
  "from-indigo-500 to-blue-600",
  "from-sky-500 to-blue-500",
  "from-fuchsia-500 to-pink-600",
];

type LeadCard = { id: string };

interface LeadCardDialogProps {
  clientPhone: string;
  clientName: string;
  clientEmail: string | null;
  venueId: string;
  open: boolean;
  onClose: () => void;
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function getAvatarGradient(name: string) {
  const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

export function LeadCardDialog({ clientPhone, clientName, clientEmail, venueId, open, onClose }: LeadCardDialogProps) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "found" | "not_found">("loading");
  const [lead, setLead] = useState<LeadCard | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setState("loading");
    setLead(null);
    const supabase = createClient();
    supabase.from("leads")
      .select("id")
      .eq("client_phone", clientPhone)
      .maybeSingle()
      .then(({ data }: { data: LeadCard | null }) => {
        if (data) { setLead(data); setState("found"); }
        else setState("not_found");
      });
  }, [open, clientPhone]);

  async function createLead() {
    setCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("leads")
      .insert({ client_name: clientName, client_phone: clientPhone, client_email: clientEmail || null, status: "booked" })
      .select("id")
      .single();
    if (error) { toast.error("שגיאה ביצירת ליד"); setCreating(false); return; }
    await supabase.from("lead_venue_interests")
      .upsert({ lead_id: data.id, venue_id: venueId }, { onConflict: "lead_id,venue_id" })
      .then(() => null, () => null);
    setCreating(false);
    setState("loading");
    const { data: refreshed } = await supabase.from("leads")
      .select("id")
      .eq("client_phone", clientPhone)
      .maybeSingle();
    if (refreshed) { setLead(refreshed); setState("found"); }
    toast.success("הליד נוצר");
  }

  const gradient = getAvatarGradient(clientName);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{clientName}</DialogTitle>

        {/* Hero header */}
        <div className="relative pt-10 pb-8 px-6 text-center bg-gradient-to-b from-muted/60 to-background">
          <div className={`mx-auto h-20 w-20 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-3xl font-bold shadow-md ring-4 ring-background`}>
            {getInitials(clientName)}
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight">{clientName}</h2>
        </div>

        {/* Body */}
        <div className="px-4 pb-5 space-y-3">

          {/* Contact card */}
          <div className="rounded-xl border bg-card divide-y overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span dir="ltr" className="font-medium">{clientPhone}</span>
            </div>
            {clientEmail && (
              <div className="flex items-center gap-3 px-4 py-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span dir="ltr" className="text-muted-foreground text-xs">{clientEmail}</span>
              </div>
            )}
          </div>

          {/* Lead status card */}
          {state === "loading" && (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}

          {state === "found" && lead && (
            <Button
              className="w-full gap-2"
              onClick={() => { onClose(); router.push(`/leads/${lead.id}`); }}
            >
              <ArrowLeft className="h-4 w-4" />
              פתח את כרטיס הליד
            </Button>
          )}

          {state === "not_found" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-dashed px-4 py-5 text-center">
                <p className="text-sm text-muted-foreground">הלקוח לא קיים ברשימת הלידים</p>
              </div>
              <Button variant="outline" className="w-full" disabled={creating} onClick={createLead}>
                {creating ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    יוצר...
                  </span>
                ) : "צור ליד"}
              </Button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
