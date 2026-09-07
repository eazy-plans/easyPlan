"use client";

import { Fragment, useMemo, useState } from "react";
import { Inbox, ChevronDown, CalendarDays, X, FileSpreadsheet, Loader2, ListChecks, PlusCircle, Pencil, Trash2, Ban } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatChip } from "@/components/ui/stat-chip";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HebrewCalendar } from "@/components/ui/hebrew-calendar";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime, toLocalDateStr } from "@/lib/utils";
import { exportToExcel, type ExcelColumn } from "@/lib/export/excel";

export interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  diff: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string } | null;
}

const ENTITY_LABELS: Record<string, string> = {
  event: "אירוע",
  venue: "אולם",
  user: "משתמש",
  lead: "ליד",
  lead_inquiry: "פנייה",
};

const ACTION_LABELS: Record<string, string> = {
  "event.create": "יצירת אירוע",
  "event.update": "עדכון אירוע",
  "event.delete": "מחיקת אירוע",
  "event.cancel": "ביטול אירוע",
  "event.replace": "אירוע הוחלף",
  "event.request_cancellation": "סימון כממתין לביטול",
  "event.undo_cancellation_request": "הסרת סימון ביטול",
  "venue.create": "יצירת אולם",
  "venue.update": "עדכון אולם",
  "venue.delete": "מחיקת אולם",
  "venue.approve": "אישור אולם",
  "venue.reject": "דחיית אולם",
  "venue.image_upload": "העלאת תמונה",
  "venue.image_delete": "מחיקת תמונה",
  "venue.image_set_primary": "קביעת תמונה ראשית",
  "venue.update_coords": "עדכון מיקום במפה",
  "user.create": "יצירת משתמש",
  "user.update": "עדכון משתמש",
  "user.block": "חסימת משתמש",
  "user.unblock": "שחזור גישת משתמש",
  "user.password_change": "שינוי סיסמה",
  "lead.create": "יצירת ליד",
  "lead.update": "עדכון ליד",
  "lead.phone_add": "הוספת טלפון לליד",
  "lead.phone_delete": "מחיקת טלפון מליד",
  "lead_inquiry.create": "יצירת פנייה",
  "lead_inquiry.delete": "מחיקת פנייה",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

const DIFF_FIELD_LABELS: Record<string, string> = {
  name: "שם",
  client_name: "שם לקוח",
  client_phone: "טלפון לקוח",
  client_email: "אימייל לקוח",
  date: "תאריך",
  venue: "אולם",
  venue_id: "אולם",
  lead: "ליד",
  lead_id: "ליד",
  reason: "סיבה",
  replaced_by_event_id: "הוחלף על ידי אירוע",
  replaced_by_client: "לקוח מחליף",
  phone: "טלפון",
  source: "מקור",
  image_id: "תמונה",
  path: "נתיב תמונה",
  lat: "קו רוחב",
  lng: "קו אורך",
  full_name: "שם מלא",
  role: "תפקיד",
  email: "אימייל",
  notes: "הערות",
  approval_status: "סטטוס אישור",
  cancellation_requested_at: "בקשת ביטול",
  price_final: "מחיר סופי",
};

function diffFieldLabel(key: string) {
  return DIFF_FIELD_LABELS[key] ?? key;
}

type ActionCategory = "destructive" | "warning" | "success" | "neutral";

function actionCategory(action: string): ActionCategory {
  if (action.endsWith(".delete") || action.endsWith(".block") || action.endsWith(".reject")) return "destructive";
  if (action.endsWith(".cancel") || action.endsWith(".request_cancellation")) return "warning";
  if (action.endsWith(".create") || action.endsWith(".approve") || action.endsWith(".unblock") || action.endsWith(".undo_cancellation_request")) return "success";
  return "neutral";
}

const CATEGORY_ICON: Record<ActionCategory, LucideIcon> = {
  destructive: Trash2,
  warning: Ban,
  success: PlusCircle,
  neutral: Pencil,
};

const CATEGORY_ICON_CLASSES: Record<ActionCategory, string> = {
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  neutral: "bg-primary/10 text-primary",
};

const CATEGORY_TEXT_CLASSES: Record<ActionCategory, string> = {
  destructive: "text-destructive",
  warning: "text-warning",
  success: "text-success",
  neutral: "text-primary",
};

function EntityBadge({ entityType }: { entityType: string }) {
  return <Badge variant="outline" className="text-[10px] shrink-0">{ENTITY_LABELS[entityType] ?? entityType}</Badge>;
}

function isFromTo(value: unknown): value is { from: unknown; to: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && "from" in value && "to" in value && Object.keys(value).length === 2;
}

function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Picks the human-readable identifier of the affected record (venue/lead/
// client name, in priority order) so the row itself answers "which one?"
// without needing to expand the diff. logAudit call sites are expected to
// always include one of these keys - as a static value when unchanged, or
// the {from, to} shape when it's the field that changed.
const SUBJECT_KEYS = ["name", "venue", "client_name", "lead", "full_name", "replaced_by_client"] as const;

function extractSubject(diff: Record<string, unknown> | null): string | null {
  if (!diff) return null;
  for (const key of SUBJECT_KEYS) {
    const value = diff[key];
    if (value == null) continue;
    const resolved = isFromTo(value) ? value.to : value;
    if (typeof resolved === "string" && resolved) return resolved;
  }
  return null;
}

// Diff values are often Hebrew (or Hebrew mixed with a Latin/numeric suffix -
// e.g. a venue name). Rendering them inside a hard dir="ltr" block forces the
// bidi algorithm to lay out RTL runs as if they were LTR tokens, which
// visibly scrambles the text - each value gets its own <bdi> so it picks its
// natural direction independent of its neighbors. Field keys are translated
// to Hebrew labels (they used to render as raw identifiers like "name",
// which read as a bare technical dump rather than a description of what
// changed); a {from, to} shaped value renders as "before ← after" instead of
// a raw JSON blob.
function DiffView({ diff }: { diff: Record<string, unknown> }) {
  return (
    <div className="text-xs bg-muted rounded-md mx-3 mb-3 p-3 overflow-x-auto space-y-1">
      {Object.entries(diff).map(([key, value]) => (
        <div key={key} className="flex gap-1.5">
          <span className="text-muted-foreground shrink-0">{diffFieldLabel(key)}:</span>
          {isFromTo(value) ? (
            <span className="flex items-center gap-1.5 flex-wrap">
              <bdi className="break-all line-through text-muted-foreground/70">{formatDiffValue(value.from)}</bdi>
              <span className="text-muted-foreground">←</span>
              <bdi className="break-all font-medium">{formatDiffValue(value.to)}</bdi>
            </span>
          ) : (
            <bdi className="break-all">{formatDiffValue(value)}</bdi>
          )}
        </div>
      ))}
    </div>
  );
}

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function DatePickerField({ label, value, onChange }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 w-full sm:w-40 justify-between font-normal">
          <span className="truncate">{value ? formatDate(new Date(value + "T12:00:00")) : label}</span>
          <CalendarDays size={16} className="text-muted-foreground shrink-0" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[660px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <HebrewCalendar
            compact
            selected={value ? new Date(value + "T12:00:00") : undefined}
            onSelect={(d) => { onChange(d ? toLocalDateStr(d) : ""); setOpen(false); }}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

// "YYYY-MM-DD" bounds of the current Israel-local month, used as the
// default date-range filter so the log opens scoped to "this month" instead
// of dumping the full 200-row window.
function currentMonthRange(): { from: string; to: string } {
  const [year, month] = toLocalDateStr(new Date()).split("-");
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return { from: `${year}-${month}-01`, to: `${year}-${month}-${String(lastDay).padStart(2, "0")}` };
}

interface AuditLogViewerProps {
  entries: AuditLogEntry[];
  migrationMissing?: boolean;
}

// G6: admin-only internal audit log - who changed what, when.
export function AuditLogViewer({ entries, migrationMissing }: AuditLogViewerProps) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(() => currentMonthRange().from);
  const [dateTo, setDateTo] = useState(() => currentMonthRange().to);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesSearch = !q ||
        actionLabel(e.action).toLowerCase().includes(q) ||
        (ENTITY_LABELS[e.entity_type] ?? e.entity_type).toLowerCase().includes(q) ||
        (e.actor?.full_name ?? "").toLowerCase().includes(q);
      const entryDate = toLocalDateStr(new Date(e.created_at));
      const matchesFrom = !dateFrom || entryDate >= dateFrom;
      const matchesTo = !dateTo || entryDate <= dateTo;
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [entries, search, dateFrom, dateTo]);

  const stats = useMemo(() => ({
    total: filtered.length,
    creates: filtered.filter((e) => e.action.endsWith(".create")).length,
    updates: filtered.filter((e) => e.action.endsWith(".update")).length,
    removed: filtered.filter((e) => e.action.endsWith(".delete") || e.action.endsWith(".cancel") || e.action.endsWith(".block")).length,
  }), [filtered]);

  const hasActiveFilters = !!search || !!dateFrom || !!dateTo;

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
  }

  const [exportError, setExportError] = useState(false);
  async function handleExport() {
    setExporting(true);
    setExportError(false);
    try {
      const columns: ExcelColumn<AuditLogEntry>[] = [
        { header: "תאריך ושעה", key: "created_at", value: (e) => formatDateTime(e.created_at), width: 18 },
        { header: "פעולה", key: "action", value: (e) => actionLabel(e.action), width: 22 },
        { header: "סוג ישות", key: "entity_type", value: (e) => ENTITY_LABELS[e.entity_type] ?? e.entity_type, width: 12 },
        { header: "מזהה ישות", key: "entity_id", value: (e) => e.entity_id ?? "", width: 26 },
        { header: "בוצע על ידי", key: "actor", value: (e) => e.actor?.full_name ?? "מערכת", width: 16 },
        { header: "פרטים", key: "diff", value: (e) => e.diff ? JSON.stringify(e.diff) : "", width: 40 },
      ];
      await exportToExcel("יומן ביקורת", "יומן ביקורת", columns, filtered);
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  }

  if (migrationMissing) {
    return (
      <p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-md px-3 py-2">
        כדי להפעיל את יומן הביקורת יש להריץ את מיגרציה 033
        (supabase/migrations/033_audit_log.sql) בעורך ה-SQL של Supabase.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip label="סה״כ רשומות" value={stats.total} icon={ListChecks} tone="primary" />
        <StatChip label="יצירות" value={stats.creates} icon={PlusCircle} tone="success" />
        <StatChip label="עדכונים" value={stats.updates} icon={Pencil} tone="violet" />
        <StatChip label="ביטולים ומחיקות" value={stats.removed} icon={Trash2} tone="warning" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="חיפוש"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <DatePickerField label="מתאריך" value={dateFrom} onChange={setDateFrom} />
          <DatePickerField label="עד תאריך" value={dateTo} onChange={setDateTo} />
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={handleExport}
          disabled={exporting || filtered.length === 0}
          aria-label={exporting ? "מייצא..." : "ייצוא לאקסל"}
          title="ייצוא לאקסל"
          className="shrink-0"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
        </Button>
      </div>
      {exportError && <p className="text-xs text-destructive">הייצוא נכשל, נסה שוב</p>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters ? `${filtered.length} מתוך ${entries.length} רשומות` : `${entries.length} רשומות`}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
            נקה פילטרים
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 py-16 text-center">
          <Inbox size={28} strokeWidth={1.5} className="text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{entries.length === 0 ? "אין רשומות ביומן הביקורת" : "אין רשומות תואמות"}</p>
        </div>
      ) : (
        <>
          {/* Table (desktop) - plain <table> (not the Table root wrapper) so the
              sticky header sticks to this screen's own scroll container, matching
              EventsTable/VenuesTable/UsersManager. */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <TableHeader className="bg-muted sticky top-0 z-10 [&_tr]:border-b-0">
                <TableRow className="hover:bg-transparent">
                  <TableHead>תאריך ושעה</TableHead>
                  <TableHead>פעולה</TableHead>
                  <TableHead>ישות</TableHead>
                  <TableHead>פרטים</TableHead>
                  <TableHead>בוצע ע״י</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => {
                  const expanded = expandedId === entry.id;
                  const hasDiff = !!entry.diff && Object.keys(entry.diff).length > 0;
                  const category = actionCategory(entry.action);
                  const CategoryIcon = CATEGORY_ICON[category];
                  const subject = extractSubject(entry.diff);
                  return (
                    <Fragment key={entry.id}>
                      <TableRow
                        className={hasDiff ? "cursor-pointer" : "hover:bg-transparent cursor-default"}
                        onClick={() => hasDiff && setExpandedId(expanded ? null : entry.id)}
                      >
                        <TableCell className="whitespace-nowrap text-muted-foreground" dir="ltr">{formatDateTime(entry.created_at)}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2 font-medium">
                            <CategoryIcon size={14} className={`shrink-0 ${CATEGORY_TEXT_CLASSES[category]}`} />
                            {actionLabel(entry.action)}
                          </span>
                        </TableCell>
                        <TableCell><EntityBadge entityType={entry.entity_type} /></TableCell>
                        <TableCell className="max-w-xs truncate">
                          {subject ? <bdi>{subject}</bdi> : <span className="text-muted-foreground/50">-</span>}
                        </TableCell>
                        <TableCell>{entry.actor?.full_name ?? "מערכת"}</TableCell>
                        <TableCell>
                          {hasDiff && (
                            <ChevronDown size={15} className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                          )}
                        </TableCell>
                      </TableRow>
                      {expanded && hasDiff && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={6} className="p-0">
                            <DiffView diff={entry.diff!} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </table>
          </div>

          {/* Cards (mobile) */}
          <div className="md:hidden divide-y divide-border/60 border rounded-lg overflow-hidden">
            {filtered.map((entry) => {
              const expanded = expandedId === entry.id;
              const hasDiff = !!entry.diff && Object.keys(entry.diff).length > 0;
              const category = actionCategory(entry.action);
              const CategoryIcon = CATEGORY_ICON[category];
              const subject = extractSubject(entry.diff);
              return (
                <div key={entry.id} className="bg-card">
                  <button
                    type="button"
                    onClick={() => hasDiff && setExpandedId(expanded ? null : entry.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-right transition-colors ${hasDiff ? "hover:bg-muted/50 cursor-pointer" : "cursor-default"}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${CATEGORY_ICON_CLASSES[category]}`}>
                        <CategoryIcon size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {actionLabel(entry.action)}
                          {subject && <><span className="text-muted-foreground font-normal"> · </span><bdi>{subject}</bdi></>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {entry.actor?.full_name ?? "מערכת"} · <span dir="ltr">{formatDateTime(entry.created_at)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <EntityBadge entityType={entry.entity_type} />
                      {hasDiff && (
                        <ChevronDown size={15} className={`shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                      )}
                    </div>
                  </button>
                  {expanded && hasDiff && <DiffView diff={entry.diff!} />}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
