import { HDate, Locale, gematriya } from "@hebcal/core";

// Strip cantillation marks and vowel points but keep maqaf (U+05BE)
const stripNikud = (s: string) => s.replace(/[֑-ֽֿ-ׇ]/g, "");

function toHDate(date: Date | string): HDate | null {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  return new HDate(d);
}

/** Short Hebrew date with gematriya, e.g. י״ז תמוז */
export function toHebrewDateShort(date: Date | string): string {
  try {
    const hd = toHDate(date);
    if (!hd) return "";
    return `${gematriya(hd.getDate())} ${stripNikud(Locale.gettext(hd.getMonthName(), "he"))}`;
  } catch (err) {
    console.error("Hebrew date conversion error:", err);
    return "";
  }
}
