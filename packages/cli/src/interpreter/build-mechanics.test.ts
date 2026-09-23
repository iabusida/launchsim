import { describe, it, expect } from "vitest";
import { buildMechanics } from "./build-mechanics.js";

const SLOT_MS = 400;

describe("buildMechanics", () => {
  it("builds an lpBurn mechanic with a 1-hour burn interval", () => {
    const [mechanic] = buildMechanics(
      [{ kind: "lpBurn", perHour: ["5%", "4%", "3%", "1%"], stepEvery: "24h" }],
      SLOT_MS,
    );
    expect(mechanic?.id).toBe("lpBurn-0");
  });

  it("builds a feeBuyback mechanic, defaulting minBuy to 0 when omitted", () => {
    const [mechanic] = buildMechanics(
      [{ kind: "feeBuyback", interval: "1h", feeShareBps: 10_000 }],
      SLOT_MS,
    );
    expect(mechanic?.id).toBe("feeBuyback-0");
  });

  it("builds a feeBuyback mechanic with an explicit minBuy", () => {
    const [mechanic] = buildMechanics(
      [{ kind: "feeBuyback", interval: "1h", feeShareBps: 10_000, minBuy: "0.01 MON" }],
      SLOT_MS,
    );
    expect(mechanic?.id).toBe("feeBuyback-0");
  });

  it("builds multiple mechanics with unique ids", () => {
    const mechanics = buildMechanics(
      [
        { kind: "lpBurn", perHour: ["5%"], stepEvery: "24h" },
        { kind: "feeBuyback", interval: "1h", feeShareBps: 10_000 },
      ],
      SLOT_MS,
    );
    expect(mechanics.map((m) => m.id)).toEqual(["lpBurn-0", "feeBuyback-1"]);
  });

  it("returns an empty array for no mechanics", () => {
    expect(buildMechanics([], SLOT_MS)).toEqual([]);
  });
});
