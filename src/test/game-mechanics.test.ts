import { describe, it, expect } from "vitest";

// ── XP Calculation ────────────────────────────────────────────────────────────

describe("XP calculation", () => {
  const calcXP = (score: number, total: number, timeBonus: number, streak: number) => {
    const base = 50;
    const scoreXP = score * 25;
    const perfection = score === total ? 50 : 0;
    const multiplier = Math.min(1 + streak * 0.1, 1.5);
    return Math.floor((base + scoreXP + timeBonus + perfection) * multiplier);
  };

  it("gives base XP for zero score", () => {
    expect(calcXP(0, 7, 0, 0)).toBe(50);
  });

  it("includes score bonus", () => {
    expect(calcXP(5, 7, 0, 0)).toBe(50 + 125); // 175
  });

  it("includes perfection bonus for full score", () => {
    expect(calcXP(7, 7, 0, 0)).toBe(50 + 175 + 50); // 275
  });

  it("applies streak multiplier (capped at 1.5x)", () => {
    // streak = 3 → 1.3x
    expect(calcXP(7, 7, 0, 3)).toBe(Math.floor(275 * 1.3)); // 357
    // streak = 10 → capped at 1.5x
    expect(calcXP(7, 7, 0, 10)).toBe(Math.floor(275 * 1.5)); // 412
  });
});

// ── Level Calculation ─────────────────────────────────────────────────────────

describe("Level calculation", () => {
  const calcLevel = (xp: number) => Math.floor(xp / 200) + 1;

  it("starts at level 1", () => {
    expect(calcLevel(0)).toBe(1);
  });

  it("level 2 at 200 XP", () => {
    expect(calcLevel(200)).toBe(2);
  });

  it("level 5 at 999 XP", () => {
    expect(calcLevel(999)).toBe(5);
  });
});

// ── Gate Threshold ────────────────────────────────────────────────────────────

describe("Gate threshold (80%)", () => {
  const calcThreshold = (total: number) => Math.ceil(total * 0.8);

  it("threshold is 6 for 7 questions", () => {
    expect(calcThreshold(7)).toBe(6);
  });

  it("threshold is 8 for 10 questions", () => {
    expect(calcThreshold(10)).toBe(8);
  });

  it("threshold is 4 for 5 questions", () => {
    expect(calcThreshold(5)).toBe(4);
  });
});

// ── Bonus Seconds Exchange ──────────────────────────────────────────────────

describe("Bonus seconds exchange", () => {
  it("can exchange when bonus >= rate", () => {
    const rate = 60;
    const bonus = 120;
    expect(bonus >= rate).toBe(true);
    expect(bonus - rate).toBe(60);
  });

  it("cannot exchange when bonus < rate", () => {
    const rate = 60;
    const bonus = 30;
    expect(bonus >= rate).toBe(false);
  });
});

// ── Lives Carry-over S1→S2 ──────────────────────────────────────────────────

describe("Lives carry-over S1 → S2", () => {
  const carryOver = (livesbanked: number, existingBonus: number) => {
    const bonusFromLives = livesbanked * 60;
    return {
      bonus_seconds_banked: existingBonus + bonusFromLives,
      lives_banked: 0,
    };
  };

  it("converts 3 lives to 180 bonus seconds", () => {
    const result = carryOver(3, 0);
    expect(result.bonus_seconds_banked).toBe(180);
    expect(result.lives_banked).toBe(0);
  });

  it("adds to existing bonus seconds", () => {
    const result = carryOver(2, 50);
    expect(result.bonus_seconds_banked).toBe(170); // 50 + 120
  });

  it("handles zero lives gracefully", () => {
    const result = carryOver(0, 100);
    expect(result.bonus_seconds_banked).toBe(100);
    expect(result.lives_banked).toBe(0);
  });
});

// ── Season Sequence ─────────────────────────────────────────────────────────

describe("Season 1 sequence", () => {
  const S1 = ["CH", "GR", "IN", "MA", "IT", "JP", "MX", "PE", "TR", "ET", "KH", "DE"];

  it("has exactly 12 countries", () => {
    expect(S1.length).toBe(12);
  });

  it("starts with CH and ends with DE", () => {
    expect(S1[0]).toBe("CH");
    expect(S1[11]).toBe("DE");
  });

  it("has no duplicates", () => {
    expect(new Set(S1).size).toBe(12);
  });
});

// ── Pi Mini-game ────────────────────────────────────────────────────────────

describe("Pi mini-game validation", () => {
  const validatePi = (input: string) => input.trim() === "314159";

  it("accepts 314159", () => {
    expect(validatePi("314159")).toBe(true);
  });

  it("rejects wrong input", () => {
    expect(validatePi("314150")).toBe(false);
  });

  it("trims whitespace", () => {
    expect(validatePi("  314159  ")).toBe(true);
  });
});
