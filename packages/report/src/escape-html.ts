const ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes the five HTML-significant characters. Every user-provided
 * string in the report (scenario name, token symbol) must go through
 * this before being embedded (docs/10).
 */
export function escapeHtml(value: string): string {
  /* v8 ignore next -- coverage-ignore: unreachable, the regex only ever matches characters that are keys of ESCAPES; this exists only for TS's noUncheckedIndexedAccess. */
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}
