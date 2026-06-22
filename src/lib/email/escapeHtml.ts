/**
 * Escapes a value for safe interpolation into an HTML email body. Client names,
 * notes and venue fields are user-entered, so without this a value like
 * `<a href="http://evil">` would render as live HTML in the recipient's inbox.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
