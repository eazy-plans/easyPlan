"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { EventRow } from "@/types/database"
import { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from "@/types/booking"
import { format } from "date-fns"

interface HebrewEventCalendarProps {
  events: EventRow[]
  selectedDate?: Date | null
  onDateSelect?: (date: Date) => void
  onEventClick?: (event: EventRow) => void
}

// Intl.DateTimeFormat construction is expensive - hoist the formatters so they
// are built once instead of per render (the day formatter used to be rebuilt
// for every calendar cell).
const hebrewMonthYearFormatter = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
  month: "long",
  year: "numeric",
})
const hebrewDayFormatter = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", { day: "numeric" })

const hebrewNumerals: Record<string, string> = {
  "1": "א", "2": "ב", "3": "ג", "4": "ד", "5": "ה", "6": "ו", "7": "ז", "8": "ח", "9": "ט",
  "10": "י", "11": "יא", "12": "יב", "13": "יג", "14": "יד", "15": "טו", "16": "טז", "17": "יז", "18": "יח", "19": "יט",
  "20": "כ", "21": "כא", "22": "כב", "23": "כג", "24": "כד", "25": "כה", "26": "כו", "27": "כז", "28": "כח", "29": "כט", "30": "ל",
}

const formatHebrewDate = (date: Date) => {
  const hebrewNum = hebrewDayFormatter.format(date)
  return hebrewNumerals[hebrewNum] || hebrewNum
}

export function HebrewEventCalendar({
  events,
  selectedDate,
  onDateSelect,
  onEventClick,
}: HebrewEventCalendarProps) {
  const [displayDate, setDisplayDate] = React.useState<Date>(new Date())

  const hebrewMonthYear = hebrewMonthYearFormatter.format(displayDate)

  // Get all days for this month with proper week alignment
  const firstDay = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1)
  const lastDay = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0)

  // Start from beginning of week containing the 1st
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const days: (Date | null)[] = []
  const current = new Date(startDate)

  while (current <= lastDay) {
    if (current.getMonth() === displayDate.getMonth()) {
      days.push(new Date(current))
    } else {
      days.push(null)
    }
    current.setDate(current.getDate() + 1)
  }

  while (days.length % 7 !== 0) {
    days.push(null)
  }

  const hebrewDayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
  const weekRows = []
  for (let i = 0; i < days.length; i += 7) {
    weekRows.push(days.slice(i, i + 7))
  }

  const handlePrevMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1))
  }

  // O(events) once per events change, instead of filtering the whole events
  // array for each of the ~35-42 day cells on every render.
  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, EventRow[]>()
    for (const event of events) {
      const key = new Date(event.date).toDateString()
      const bucket = map.get(key)
      if (bucket) bucket.push(event)
      else map.set(key, [event])
    }
    return map
  }, [events])

  const getEventsForDate = (date: Date) => eventsByDay.get(date.toDateString()) ?? []

  const isSaturday = (date: Date) => date.getDay() === 6
  const isSelected = (date: Date) =>
    selectedDate instanceof Date &&
    date.getDate() === selectedDate.getDate() &&
    date.getMonth() === selectedDate.getMonth() &&
    date.getFullYear() === selectedDate.getFullYear()

  return (
    <div className="w-full bg-background" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 px-4">
        <h2 className="text-xl font-bold text-center flex-1">{hebrewMonthYear}</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handlePrevMonth} className="h-8 w-8 p-0">
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Table */}
      <table className="w-full border-collapse border border-blue-600">
        <thead>
          <tr className="bg-blue-600 text-white">
            {hebrewDayNames.map((day) => (
              <th key={day} className="border border-blue-600 p-3 text-sm font-bold text-center">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weekRows.map((week, weekIdx) => (
            <tr key={weekIdx}>
              {week.map((date, dayIdx) => {
                if (!date) {
                  return <td key={dayIdx} className="border border-gray-300 p-4 bg-gray-50" />
                }

                const dayEvents = getEventsForDate(date)
                const isSat = isSaturday(date)
                const isSelected_ = isSelected(date)

                return (
                  <td
                    key={dayIdx}
                    onClick={() => onDateSelect?.(date)}
                    className={cn(
                      "border border-gray-300 p-3 text-center transition-colors align-top",
                      "bg-white cursor-pointer hover:bg-gray-50",
                      isSat && "bg-blue-50",
                      isSelected_ && "bg-yellow-300 border-2 border-yellow-400"
                    )}
                  >
                    {/* Date Header */}
                    <div className="mb-2">
                      <div className="font-bold text-lg text-blue-600">{formatHebrewDate(date)}</div>
                      <div className="text-xs text-gray-600">יומי {date.getDate()}</div>
                    </div>

                    {/* Events */}
                    <div className="space-y-1 text-left text-xs">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick?.(event)
                          }}
                          className="p-1 rounded cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor: EVENT_TYPE_COLORS[event.event_type] + "20",
                            borderLeft: `3px solid ${EVENT_TYPE_COLORS[event.event_type]}`,
                          }}
                        >
                          <div className="font-medium" style={{ color: EVENT_TYPE_COLORS[event.event_type] }}>
                            {format(new Date(event.booking_date || event.created_at), "HH:mm")}
                          </div>
                          <div className="text-gray-700 truncate">{event.client_name}</div>
                        </div>
                      ))}
                    </div>
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
