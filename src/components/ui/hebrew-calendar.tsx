"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toHebrewDateShort } from "@/lib/hebrew-calendar"

/**
 * Hebrew Calendar Table Component
 *
 * Renders a traditional Hebrew calendar table with:
 * - Hebrew month name (תשרי, חשוון, etc.)
 * - Hebrew dates as primary (numerals: א, ב, ג, etc.)
 * - Gregorian dates as secondary (1, 2, 3, etc.)
 * - Week navigation
 * - Sabbath highlighting
 */
export function HebrewCalendar(props: any) {
  const { className, selected, onSelect, disabled, ...restProps } = props
  const [displayDate, setDisplayDate] = React.useState<Date>(selected instanceof Date ? selected : new Date())

  // Get Hebrew month and year
  const formatter = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
    month: "long",
    year: "numeric",
  })
  const hebrewMonthYear = formatter.format(displayDate)

  // Get all days for this month with proper week alignment
  const firstDay = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1)
  const lastDay = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0)

  // Start from beginning of week containing the 1st
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const days: (Date | null)[] = []
  const current = new Date(startDate)

  // Add days until we pass the last day of the month
  while (current <= lastDay) {
    if (current.getMonth() === displayDate.getMonth()) {
      days.push(new Date(current))
    } else {
      days.push(null) // Empty cell for non-month days
    }
    current.setDate(current.getDate() + 1)
  }

  // Add remaining days to complete the last week
  while (days.length % 7 !== 0) {
    days.push(null)
  }

  const hebrewDayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
  const weekRows = []
  for (let i = 0; i < days.length; i += 7) {
    weekRows.push(days.slice(i, i + 7))
  }

  const formatHebrewDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const formatter = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
      day: "numeric",
    })
    const hebrewNum = formatter.format(date)

    // Convert to Hebrew numerals using the toHebrewDateShort logic
    const hebrewNumerals: Record<string, string> = {
      "1": "א", "2": "ב", "3": "ג", "4": "ד", "5": "ה", "6": "ו", "7": "ז", "8": "ח", "9": "ט",
      "10": "י", "11": "יא", "12": "יב", "13": "יג", "14": "יד", "15": "טו", "16": "טז", "17": "יז", "18": "יח", "19": "יט",
      "20": "כ", "21": "כא", "22": "כב", "23": "כג", "24": "כד", "25": "כה", "26": "כו", "27": "כז", "28": "כח", "29": "כט", "30": "ל",
    }

    return hebrewNumerals[hebrewNum] || hebrewNum
  }

  const formatGregorianDate = (date: Date) => {
    return date.getDate()
  }

  const handlePrevMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1))
  }

  const isSaturday = (date: Date) => date.getDay() === 6
  const isCurrentMonth = (date: Date) => date.getMonth() === displayDate.getMonth()
  const isSelected = (date: Date) =>
    selected instanceof Date &&
    date.getDate() === selected.getDate() &&
    date.getMonth() === selected.getMonth() &&
    date.getFullYear() === selected.getFullYear()

  return (
    <div className={cn("w-full bg-background", className)} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 px-4">
        <h2 className="text-xl font-bold text-center flex-1">{hebrewMonthYear}</h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Table */}
      <table className="w-full border-collapse border border-blue-600">
        <thead>
          <tr className="bg-blue-600 text-white">
            {hebrewDayNames.map((day) => (
              <th
                key={day}
                className="border border-blue-600 p-3 text-sm font-bold text-center"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weekRows.map((week, weekIdx) => (
            <tr key={weekIdx}>
              {week.map((date, dayIdx) => {
                // Handle empty cells
                if (!date) {
                  return (
                    <td key={dayIdx} className="border border-gray-300 p-4 bg-gray-50" />
                  )
                }

                const isCurrentMth = isCurrentMonth(date)
                const isSat = isSaturday(date)
                const isSelected_ = isSelected(date)
                const isDisabled = disabled?.(date)
                const isToday = new Date().toDateString() === date.toDateString()

                return (
                  <td
                    key={dayIdx}
                    onClick={() => {
                      if (!isDisabled && onSelect) {
                        onSelect(date)
                      }
                    }}
                    className={cn(
                      "border border-gray-300 p-4 text-center transition-colors",
                      isDisabled ? "bg-red-100 opacity-60 cursor-not-allowed" : "bg-white",
                      isSat && !isDisabled && "bg-blue-50",
                      isSelected_ && "bg-yellow-300 border-2 border-yellow-400",
                      isToday && !isDisabled && "border-2 border-orange-400",
                      !isDisabled && "cursor-pointer hover:bg-gray-50"
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="font-bold text-lg leading-tight">{formatHebrewDate(date)}</div>
                      <div className="text-xs text-gray-600">{formatGregorianDate(date)}</div>
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

export const hebrewLocale = "he-IL-u-ca-hebrew"
