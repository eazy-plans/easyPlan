"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import {
  HebrewCalendar as Hebcal,
  HDate,
  Locale,
  ParshaEvent,
  gematriya,
  flags,
  type Event as HebcalEvent,
} from "@hebcal/core"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toLocalDateStr } from "@/lib/utils"

/**
 * Hebrew Month Calendar
 *
 * The base unit is the HEBREW month (תמוז, אב...) - leading/trailing days of
 * adjacent Hebrew months are shown grayed out, like a traditional Jewish wall
 * calendar. Each cell shows the Hebrew date as primary (gematriya: א׳, י״ז)
 * and the Gregorian date as secondary, plus the weekly parsha, Rosh Chodesh,
 * holidays and fasts (Israel schedule).
 */

interface DayInfo {
  /** parsha name without the "פרשת" prefix, e.g. "חקת" */
  parsha?: string
  /** red-ish entries: fasts and major holidays */
  fasts: string[]
  /** green entries: ראש חודש and other holidays */
  holidays: string[]
}

// Strip cantillation marks and vowel points but keep maqaf (U+05BE) so
// hyphenated names like מטות־מסעי stay readable
const stripNikud = (s: string) => s.replace(/[֑-ֽֿ-ׇ]/g, "")

// Observances we don't show (matched by hebcal's stable English identifiers)
const HIDDEN_EVENTS = new Set([
  "Leil Selichot",
  "Chag HaBanot",
  "Rosh Hashana LaBehemot",
  "Ta'anit Bechorot",
])

function buildDayInfo(gridStart: Date, gridEnd: Date): Map<string, DayInfo> {
  const map = new Map<string, DayInfo>()
  const get = (key: string): DayInfo => {
    let info = map.get(key)
    if (!info) {
      info = { fasts: [], holidays: [] }
      map.set(key, info)
    }
    return info
  }

  let events: HebcalEvent[] = []
  try {
    events = Hebcal.calendar({
      start: gridStart,
      end: gridEnd,
      il: true,
      sedrot: true,
      noModern: true,
    })
  } catch (err) {
    console.error("hebcal calendar error:", err)
    return map
  }

  for (const ev of events) {
    if (HIDDEN_EVENTS.has(ev.getDesc())) continue
    const date = ev.getDate().greg()
    const info = get(toLocalDateStr(date))
    const evFlags = ev.getFlags()

    if (ev instanceof ParshaEvent) {
      info.parsha = stripNikud(ev.render("he")).replace(/^פרשת\s+/, "")
    } else if (evFlags & flags.ROSH_CHODESH) {
      info.holidays.push("ראש חודש")
    } else if (evFlags & (flags.MINOR_FAST | flags.MAJOR_FAST)) {
      info.fasts.push(stripNikud(ev.render("he")))
    } else {
      info.holidays.push(stripNikud(ev.render("he")))
    }
  }
  return map
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const HEBREW_DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
// Narrow screens can't fit the full names in 7 columns
const HEBREW_DAY_NAMES_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "שבת"]

const gregorianMonthFormatter = new Intl.DateTimeFormat("he-IL", { month: "long" })
const gregorianMonthYearFormatter = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" })

export interface HebrewCalendarProps {
  selected?: Date | null
  onSelect?: (date: Date) => void
  disabled?: (date: Date) => boolean
  className?: string
  /** Extra content rendered inside a day cell (event chips etc.) */
  renderDay?: (date: Date) => React.ReactNode
  /** Extra classes for a day cell (e.g. booked-day highlight) */
  dayClassName?: (date: Date) => string | undefined
  /** Month shown initially (defaults to the selected date or today) */
  defaultMonth?: Date
  /** Tighter cells for popovers / pickers */
  compact?: boolean
}

export function HebrewCalendar({
  selected,
  onSelect,
  disabled,
  className,
  renderDay,
  dayClassName,
  defaultMonth,
  compact = false,
}: HebrewCalendarProps) {
  // Anchor is the absolute day number (R.D.) of the 1st of the displayed
  // HEBREW month. Stored as a number: HDate.add/subtract does ~30-day
  // arithmetic (subtract(1,"month") from 1 Av returns 30 Sivan, not 1
  // Tammuz), so month navigation must normalize to the 1st explicitly.
  const firstOfMonthAbs = (abs: number): number => {
    const hd = new HDate(abs)
    return new HDate(1, hd.getMonth(), hd.getFullYear()).abs()
  }
  const [anchorAbs, setAnchorAbs] = React.useState<number>(() => {
    const base = selected instanceof Date ? selected : defaultMonth ?? new Date()
    return firstOfMonthAbs(new HDate(base).abs())
  })
  const monthAnchor = React.useMemo(() => new HDate(firstOfMonthAbs(anchorAbs)), [anchorAbs])

  const shiftMonth = (delta: 1 | -1) =>
    setAnchorAbs((abs) => {
      const first = firstOfMonthAbs(abs)
      // Hebrew months are contiguous in absolute days, so the 1st of the next
      // month is first + daysInMonth, and any day of the previous month is
      // first - 1
      return delta === 1 ? first + new HDate(first).daysInMonth() : firstOfMonthAbs(first - 1)
    })

  const { weeks, gridStart, gridEnd, monthStart, monthEnd } = React.useMemo(() => {
    const monthStart = monthAnchor.greg()
    const monthEnd = new HDate(monthAnchor.daysInMonth(), monthAnchor.getMonth(), monthAnchor.getFullYear()).greg()
    const gridStart = addDays(monthStart, -monthStart.getDay())
    const gridEnd = addDays(monthEnd, 6 - monthEnd.getDay())

    const weeks: Date[][] = []
    let cursor = gridStart
    while (cursor <= gridEnd) {
      const week: Date[] = []
      for (let i = 0; i < 7; i++) {
        week.push(cursor)
        cursor = addDays(cursor, 1)
      }
      weeks.push(week)
    }
    return { weeks, gridStart, gridEnd, monthStart, monthEnd }
  }, [monthAnchor])

  const dayInfo = React.useMemo(() => buildDayInfo(gridStart, gridEnd), [gridStart, gridEnd])

  const hebrewTitle = `${stripNikud(Locale.gettext(monthAnchor.getMonthName(), "he"))} ${gematriya(monthAnchor.getFullYear())}`
  const gregorianSubtitle =
    monthStart.getMonth() === monthEnd.getMonth()
      ? gregorianMonthYearFormatter.format(monthStart)
      : `${gregorianMonthFormatter.format(monthStart)} – ${gregorianMonthYearFormatter.format(monthEnd)}`

  const isCurrentHebrewMonth = (date: Date) => {
    const hd = new HDate(date)
    return hd.getMonth() === monthAnchor.getMonth() && hd.getFullYear() === monthAnchor.getFullYear()
  }

  const today = new Date()

  const goToday = () => {
    setAnchorAbs(firstOfMonthAbs(new HDate(new Date()).abs()))
  }

  return (
    // max-w-[98vw] is a viewport-definite cap: inside Radix popper wrappers
    // (min-width: max-content) a fixed-layout table with w-full otherwise
    // resolves its max-content width to ~1,000,000px
    <div className={cn("w-full max-w-[98vw] bg-background", className)} dir="rtl">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => shiftMonth(-1)} className="h-8 w-8 p-0" aria-label="חודש קודם">
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="h-8 px-2 text-xs">
            היום
          </Button>
          <Button variant="ghost" size="sm" onClick={() => shiftMonth(1)} className="h-8 w-8 p-0" aria-label="חודש הבא">
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 text-center">
          <h2 className={cn("whitespace-nowrap font-bold leading-tight text-[#1467b3]", compact ? "text-base sm:text-lg" : "text-lg sm:text-xl")}>{hebrewTitle}</h2>
          <div className="text-xs text-muted-foreground">{gregorianSubtitle}</div>
        </div>
        {/* Spacer to keep the title centered; dropped on phones where every pixel counts */}
        <div className="hidden w-[104px] sm:block" aria-hidden />
      </div>

      {/* Calendar table */}
      {/* compact mode has no min-width: it must fit phone screens (booking wizard, popovers) */}
      <table className={cn("w-full table-fixed border-collapse", !compact && "min-w-[560px]")}>
        <thead>
          <tr className="bg-[#1467b3] text-white">
            {HEBREW_DAY_NAMES.map((day, i) => (
              <th key={day} className="border border-[#1467b3] p-1.5 text-center text-xs font-bold sm:p-2 sm:text-sm">
                <span className="sm:hidden">{HEBREW_DAY_NAMES_SHORT[i]}</span>
                <span className="hidden sm:inline">{day}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIdx) => (
            <tr key={weekIdx}>
              {week.map((date, dayIdx) => {
                const inMonth = isCurrentHebrewMonth(date)
                const isSat = date.getDay() === 6
                const isToday = isSameDay(date, today)
                const isSelectedDay = selected instanceof Date && isSameDay(date, selected)
                const isDisabled = disabled?.(date) ?? false
                const info = dayInfo.get(toLocalDateStr(date))
                const hd = new HDate(date)

                return (
                  <td
                    key={dayIdx}
                    onClick={() => {
                      if (!isDisabled) onSelect?.(date)
                    }}
                    className={cn(
                      "border border-gray-300 bg-white p-1 align-top transition-colors sm:p-1.5",
                      compact ? "h-14 sm:h-16" : "h-24",
                      isSat && "bg-slate-100",
                      isDisabled
                        ? "cursor-not-allowed bg-gray-100 opacity-60"
                        : onSelect && "cursor-pointer hover:bg-blue-50/60",
                      // after the disabled styles so callers can re-color specific
                      // blocked days (e.g. booked-red vs plain unavailable-gray)
                      dayClassName?.(date),
                      isToday && "bg-amber-100",
                      isSelectedDay && "bg-sky-100 ring-2 ring-inset ring-[#1467b3]"
                    )}
                  >
                    <div className={cn("flex flex-col gap-0.5 text-right", !inMonth && "opacity-40")}>
                      <div className={cn("font-bold leading-tight text-[#1467b3]", compact ? "text-base sm:text-lg" : "text-lg sm:text-xl")}>
                        {gematriya(hd.getDate())}
                      </div>
                      <div className="text-[10px] leading-tight sm:text-[11px]">
                        <span className="font-medium text-amber-600">{String(date.getDate()).padStart(2, "0")}</span>{" "}
                        <span className="text-gray-500">{gregorianMonthFormatter.format(date)}</span>
                      </div>
                      {info?.fasts.map((t) => (
                        <div key={t} className="text-[10px] font-semibold leading-tight text-red-700 sm:text-[11px]">{t}</div>
                      ))}
                      {info?.holidays.map((t) => (
                        <div key={t} className="text-[10px] leading-tight text-green-700 sm:text-[11px]">{t}</div>
                      ))}
                      {info?.parsha && (
                        <div className="text-[10px] font-bold leading-tight text-yellow-800 sm:text-[11px]">{info.parsha}</div>
                      )}
                    </div>
                    {renderDay && <div className="mt-1">{renderDay(date)}</div>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
