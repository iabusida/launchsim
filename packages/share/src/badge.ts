import { Resvg } from "@resvg/resvg-js";
import type { RunResult } from "@launchsim/report";
import { escapeHtml } from "@launchsim/report";

const WIDTH = 1200;
const HEIGHT = 630;

function worstFailingCheck(result: RunResult): string | null {
  const failing = result.checks.find((check) => !check.passed);
  return failing ? failing.summary : null;
}

/**
 * Renders a badge (docs/05: "PASS/FAIL, worst failing check, 'simulated ·
 * not an audit'") as inline SVG, deterministic for a given `RunResult` --
 * no chart library, no CDN (docs/08 golden rule, docs/04). The badge never
 * claims safety; see the fixed disclaimer line.
 */
export function renderBadgeSvg(result: RunResult): string {
  const badge = result.passed ? "PASS" : "FAIL";
  const badgeColor = result.passed ? "#16a34a" : "#dc2626";
  const worst = worstFailingCheck(result);
  const subtitle = worst ? escapeHtml(worst) : "all checks passed";

  return `<svg width="${String(WIDTH)}" height="${String(HEIGHT)}" viewBox="0 0 ${String(WIDTH)} ${String(HEIGHT)}" xmlns="http://www.w3.org/2000/svg">
<rect width="${String(WIDTH)}" height="${String(HEIGHT)}" fill="#0b0b0b" />
<text x="60" y="180" font-family="system-ui, sans-serif" font-size="56" fill="#eeeeee">${escapeHtml(result.scenario.name)}</text>
<text x="60" y="280" font-family="system-ui, sans-serif" font-size="96" font-weight="bold" fill="${badgeColor}">${badge}</text>
<text x="60" y="360" font-family="system-ui, sans-serif" font-size="32" fill="#aaaaaa">${subtitle}</text>
<text x="60" y="560" font-family="system-ui, sans-serif" font-size="24" fill="#666666">simulated &#183; not an audit</text>
</svg>`;
}

/** Renders {@link renderBadgeSvg}'s output as a PNG buffer, for social unfurl `og:image` support (docs/05). */
export function renderBadgePng(result: RunResult): Buffer {
  return new Resvg(renderBadgeSvg(result), { fitTo: { mode: "width", value: WIDTH } }).render().asPng();
}
