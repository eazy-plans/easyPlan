function numberToHebrewNumerals(num: number): string {
  const hebrewNumerals: Record<number, string> = {
    1: "א", 2: "ב", 3: "ג", 4: "ד", 5: "ה", 6: "ו", 7: "ז", 8: "ח", 9: "ט",
    10: "י", 11: "יא", 12: "יב", 13: "יג", 14: "יד", 15: "טו", 16: "טז", 17: "יז", 18: "יח", 19: "יט",
    20: "כ", 21: "כא", 22: "כב", 23: "כג", 24: "כד", 25: "כה", 26: "כו", 27: "כז", 28: "כח", 29: "כט", 30: "ל",
  };
  return hebrewNumerals[num] || num.toString();
}

export function toHebrewDate(date: Date | string): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";

    const formatter = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const parts = formatter.formatToParts(d);
    let day = "", month = "", year = "";

    for (const part of parts) {
      if (part.type === "day") {
        const dayNum = parseInt(part.value, 10);
        day = numberToHebrewNumerals(dayNum);
      }
      if (part.type === "month") month = part.value;
      if (part.type === "year") year = part.value;
    }

    if (!day || !month || !year) return "";
    return `${day} ${month} ${year}`;
  } catch (err) {
    console.error("Hebrew date conversion error:", err);
    return "";
  }
}

export function toHebrewDateShort(date: Date | string): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";

    // Test if Intl support exists
    if (!Intl.DateTimeFormat) {
      console.warn("Intl.DateTimeFormat not available");
      return "";
    }

    const formatter = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
      day: "numeric",
      month: "long",
    });
    const parts = formatter.formatToParts(d);

    console.debug("Hebrew calendar parts for", d.toISOString(), ":", parts);

    let day = "", month = "";

    for (const part of parts) {
      if (part.type === "day") {
        const dayNum = parseInt(part.value, 10);
        day = numberToHebrewNumerals(dayNum);
      }
      if (part.type === "month") month = part.value;
    }

    if (!day || !month) {
      console.debug("Hebrew date missing parts - day:", day, "month:", month, "parts:", parts);
      return "";
    }
    return `${day} ${month}`;
  } catch (err) {
    console.error("Hebrew date conversion error:", err, "for date:", date);
    return "";
  }
}
