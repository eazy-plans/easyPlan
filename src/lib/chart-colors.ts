// Recharts needs real color strings for <stop stopColor>; SVG presentation
// attributes support CSS var(), so these stay in sync with the theme tokens
// in globals.css instead of hardcoding hex that can drift from the palette.
export const CHART_GRADIENTS = {
  primary: { from: "hsl(var(--primary))", to: "hsl(var(--primary) / 0.85)" },
  success: { from: "hsl(var(--success))", to: "hsl(var(--success) / 0.85)" },
  violet: { from: "#8b5cf6", to: "#6d28d9" },
} as const;
