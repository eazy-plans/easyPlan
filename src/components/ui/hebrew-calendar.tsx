"use client"

import * as React from "react"
import { DayPicker as HebrewDayPicker, he } from "@daypicker/hebrew"

/**
 * Hebrew Calendar Picker Component
 *
 * Renders a full Hebrew calendar with:
 * - Hebrew month names (תשרי, חשוון, etc.)
 * - Hebrew date navigation
 * - RTL layout
 * - Full Hebrew calendar cycle with leap years
 */
export function HebrewCalendar(props: any) {
  const { className, ...restProps } = props

  return (
    <HebrewDayPicker
      locale={he}
      dir="rtl"
      showOutsideDays={false}
      {...restProps}
      className={`bg-background group/calendar p-3 [--cell-size:2rem] ${className || ""}`}
    />
  )
}

export { he as hebrewLocale } from "@daypicker/hebrew"
