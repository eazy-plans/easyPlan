"use client"

import * as React from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  id?: string
  options: ComboboxOption[]
  /** "" means no selection (the placeholder / "all" row) */
  value: string
  onValueChange: (value: string) => void
  /** Trigger text when empty; also labels the clear row at the top of the list */
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  /** false drops the clear/"all" row - use for required fields with no "none" state */
  clearable?: boolean
  disabled?: boolean
  /** Focus target for validation errors (React 19 ref-as-prop) */
  ref?: React.Ref<HTMLButtonElement>
}

/**
 * Single-select dropdown with a type-to-filter input - Select kept forcing
 * users to scroll long venue/city lists. Built on Popover since cmdk isn't
 * a dependency.
 */
export function Combobox({
  id,
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder = "הקלד לחיפוש...",
  emptyText = "לא נמצאו תוצאות",
  className,
  clearable = true,
  disabled = false,
  ref,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [highlighted, setHighlighted] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label

  const q = query.trim().toLowerCase()
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
  // While typing, the clear/"all" row would just be noise above the matches
  const rows: ComboboxOption[] =
    q || !clearable ? filtered : [{ value: "", label: placeholder }, ...filtered]

  const select = (v: string) => {
    onValueChange(v)
    setOpen(false)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setQuery("")
      setHighlighted(0)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, rows.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const row = rows[highlighted]
      if (row) select(row.value)
    }
  }

  React.useEffect(() => {
    listRef.current?.children[highlighted]?.scrollIntoView({ block: "nearest" })
  }, [highlighted])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          id={id}
          ref={ref}
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className={cn("truncate text-right", !selectedLabel && "text-muted-foreground")}>
            {selectedLabel ?? placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        dir="rtl"
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          inputRef.current?.focus()
        }}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setHighlighted(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div ref={listRef} role="listbox" className="max-h-60 overflow-y-auto p-1">
          {rows.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
          )}
          {rows.map((row, i) => (
            <button
              key={row.value}
              type="button"
              role="option"
              aria-selected={row.value === value}
              onClick={() => select(row.value)}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                "flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                i === highlighted && "bg-accent text-accent-foreground"
              )}
            >
              <Check
                className={cn(
                  "h-4 w-4 shrink-0",
                  (row.value === "" ? value === "" : row.value === value) ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="truncate text-right">{row.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
