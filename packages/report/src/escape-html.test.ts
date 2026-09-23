import { describe, it, expect } from "vitest";
import { escapeHtml } from "./escape-html.js";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;",
    );
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("hourly burn from LP")).toBe("hourly burn from LP");
  });

  it("handles an empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});
