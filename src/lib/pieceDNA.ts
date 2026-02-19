// ─── W.E.P. Piece DNA — Unique visual identity per country ───────────────────
// Each country has a fixed visual DNA: gem, symbol, keyword, pattern.
// This dictionary is the single source of truth for all 195 pieces.
// Extensible: add an entry per country code — fallback handles the rest.

export type GemShape = "diamond" | "hexagon" | "circle" | "star" | "octagon";
export type PatternType = "grid" | "diagonal" | "dots" | "waves" | "triangles";

export interface PieceDNA {
  gemColor: string;        // HSL color of the central gem
  gemShape: GemShape;      // Geometric shape of the gem
  symbolPath: string;      // SVG path for the engraved central symbol (in 0 0 30 30 viewBox)
  keyword: string;         // Engraved keyword (max 12 chars)
  patternType: PatternType;// Background micro-pattern type
  accentColor: string;     // Secondary color (gem reflection on metal)
  continentBase: string;   // Base metal gradient color by continent
}

// ─── Country DNA Dictionary ──────────────────────────────────────────────────

export const PIECE_DNA: Record<string, PieceDNA> = {

  // 🇨🇭 Switzerland — Ice-blue gem, Alpine Cross, Grid pattern
  CH: {
    gemColor: "hsl(200 80% 65%)",
    gemShape: "diamond",
    // Alpine cross: two rectangles forming a cross
    symbolPath: "M 12 5 L 18 5 L 18 12 L 25 12 L 25 18 L 18 18 L 18 25 L 12 25 L 12 18 L 5 18 L 5 12 L 12 12 Z",
    keyword: "NEUTRALITY",
    patternType: "grid",
    accentColor: "hsl(200 60% 85%)",
    continentBase: "hsl(215 30% 22%)",
  },

  // 🇺🇸 United States — Patriot blue gem, 5-point star, Stripes pattern
  US: {
    gemColor: "hsl(220 70% 60%)",
    gemShape: "star",
    // 5-point star
    symbolPath: "M 15 3 L 17.5 10.5 L 25 10.5 L 19 15.5 L 21.5 23 L 15 18.5 L 8.5 23 L 11 15.5 L 5 10.5 L 12.5 10.5 Z",
    keyword: "REGULATION",
    patternType: "diagonal",
    accentColor: "hsl(0 70% 70%)",
    continentBase: "hsl(220 30% 20%)",
  },

  // 🇨🇳 China — Deep red gem, Geometric dragon line, Waves pattern
  CN: {
    gemColor: "hsl(0 75% 52%)",
    gemShape: "hexagon",
    // Geometric dragon: angular zigzag representing dragon path
    symbolPath: "M 3 15 L 8 8 L 12 13 L 16 6 L 20 11 L 24 5 L 27 10 L 22 17 L 18 12 L 14 19 L 10 14 L 6 21 Z",
    keyword: "INFLUENCE",
    patternType: "waves",
    accentColor: "hsl(45 90% 60%)",
    continentBase: "hsl(0 30% 18%)",
  },

  // 🇧🇷 Brazil — Emerald green gem, Southern Cross (5 stars), Triangles pattern
  BR: {
    gemColor: "hsl(140 65% 48%)",
    gemShape: "circle",
    // Southern Cross: 5 small stars constellation
    symbolPath: "M 15 4 L 16.2 7.5 L 20 7.5 L 17 9.8 L 18.2 13.3 L 15 11 L 11.8 13.3 L 13 9.8 L 10 7.5 L 13.8 7.5 Z M 22 14 L 22.8 16.5 L 25.5 16.5 L 23.3 18 L 24.1 20.5 L 22 19 L 19.9 20.5 L 20.7 18 L 18.5 16.5 L 21.2 16.5 Z M 8 16 L 8.8 18.5 L 11.5 18.5 L 9.3 20 L 10.1 22.5 L 8 21 L 5.9 22.5 L 6.7 20 L 4.5 18.5 L 7.2 18.5 Z",
    keyword: "CHAOS",
    patternType: "triangles",
    accentColor: "hsl(50 90% 60%)",
    continentBase: "hsl(140 30% 15%)",
  },

  // 🇪🇬 Egypt — Amber gold gem, Pyramid eye, Dots pattern
  EG: {
    gemColor: "hsl(45 85% 58%)",
    gemShape: "diamond",
    // Eye of Horus / Pyramid silhouette
    symbolPath: "M 15 4 L 27 24 L 3 24 Z M 15 12 L 18 17 L 12 17 Z M 15 11 L 15 9 M 13 12 L 11 10 M 17 12 L 19 10",
    keyword: "ANCIENNETE",
    patternType: "dots",
    accentColor: "hsl(45 70% 80%)",
    continentBase: "hsl(35 30% 20%)",
  },

  // 🇯🇵 Japan — Lacquer red gem, Rising Sun rays, Waves pattern
  JP: {
    gemColor: "hsl(355 80% 52%)",
    gemShape: "circle",
    // Rising sun: central circle + 8 rays
    symbolPath: "M 15 10 A 5 5 0 0 1 20 15 A 5 5 0 0 1 15 20 A 5 5 0 0 1 10 15 A 5 5 0 0 1 15 10 Z M 15 3 L 15 7 M 15 23 L 15 27 M 3 15 L 7 15 M 23 15 L 27 15 M 6 6 L 9 9 M 21 21 L 24 24 M 24 6 L 21 9 M 6 24 L 9 21",
    keyword: "TRADITION",
    patternType: "waves",
    accentColor: "hsl(355 60% 80%)",
    continentBase: "hsl(355 20% 18%)",
  },

  // 🇮🇳 India — Saffron orange gem, Ashoka Wheel (simplified spokes), Triangles
  IN: {
    gemColor: "hsl(30 85% 58%)",
    gemShape: "octagon",
    // Ashoka Wheel: circle + 8 spokes
    symbolPath: "M 15 6 A 9 9 0 0 1 24 15 A 9 9 0 0 1 15 24 A 9 9 0 0 1 6 15 A 9 9 0 0 1 15 6 Z M 15 6 L 15 24 M 6 15 L 24 15 M 8.4 8.4 L 21.6 21.6 M 21.6 8.4 L 8.4 21.6 M 15 11 A 4 4 0 0 1 19 15 A 4 4 0 0 1 15 19 A 4 4 0 0 1 11 15 A 4 4 0 0 1 15 11 Z",
    keyword: "DHARMA",
    patternType: "triangles",
    accentColor: "hsl(140 60% 55%)",
    continentBase: "hsl(30 25% 18%)",
  },

  // 🇷🇺 Russia — Imperial blue gem, Double-headed eagle (simplified), Grid
  RU: {
    gemColor: "hsl(215 65% 55%)",
    gemShape: "hexagon",
    // Simplified double-headed eagle: two triangles up + body
    symbolPath: "M 15 16 L 15 26 M 12 26 L 18 26 M 8 8 L 12 14 L 15 16 L 18 14 L 22 8 M 8 8 L 6 12 L 10 12 Z M 22 8 L 24 12 L 20 12 Z M 13 19 L 17 19",
    keyword: "EMPIRE",
    patternType: "grid",
    accentColor: "hsl(45 85% 60%)",
    continentBase: "hsl(215 25% 16%)",
  },

  // 🇫🇷 France — Royal blue gem, Fleur-de-lys, Diagonal
  FR: {
    gemColor: "hsl(225 75% 58%)",
    gemShape: "diamond",
    // Fleur-de-lys stylized
    symbolPath: "M 15 5 C 15 5 11 9 11 13 C 11 16 13 17 15 17 C 17 17 19 16 19 13 C 19 9 15 5 15 5 Z M 15 17 L 15 26 M 11 22 L 19 22 M 9 13 C 9 13 6 12 5 15 C 4 18 7 20 10 19 M 21 13 C 21 13 24 12 25 15 C 26 18 23 20 20 19",
    keyword: "DIPLOMATIE",
    patternType: "diagonal",
    accentColor: "hsl(0 70% 60%)",
    continentBase: "hsl(225 25% 18%)",
  },

  // 🇲🇦 Morocco — Emerald gem, 6-pointed star (Seal of Solomon), Dots
  MA: {
    gemColor: "hsl(155 55% 44%)",
    gemShape: "star",
    // 6-pointed star (Star of David / Islamic Seal)
    symbolPath: "M 15 4 L 18.5 10.5 L 26 10.5 L 20 15.5 L 22.5 22 L 15 18 L 7.5 22 L 10 15.5 L 4 10.5 L 11.5 10.5 Z M 15 8 L 12 13 L 18 13 Z M 15 22 L 12 17 L 18 17 Z",
    keyword: "CARREFOUR",
    patternType: "dots",
    accentColor: "hsl(0 70% 55%)",
    continentBase: "hsl(155 20% 16%)",
  },

  // 🇬🇷 Greece — Mediterranean blue gem, Greek column, Waves
  GR: {
    gemColor: "hsl(205 70% 58%)",
    gemShape: "octagon",
    // Greek column: capital + shaft + base
    symbolPath: "M 8 8 L 22 8 L 22 10 L 8 10 Z M 11 10 L 11 22 M 19 10 L 19 22 M 7 22 L 23 22 L 23 24 L 7 24 Z M 9 22 L 21 22",
    keyword: "DEMOCRATIE",
    patternType: "waves",
    accentColor: "hsl(205 50% 85%)",
    continentBase: "hsl(205 25% 18%)",
  },

  // 🇮🇹 Italy — Terracotta red gem, She-wolf (simplified), Diagonal
  IT: {
    gemColor: "hsl(15 65% 52%)",
    gemShape: "circle",
    // Simplified she-wolf / Romulus and Remus silhouette
    symbolPath: "M 5 20 C 5 20 8 15 12 16 C 14 16.5 15 18 17 17 C 19 16 20 14 22 14 C 24 14 26 16 26 18 L 24 18 C 23 17 22 16 21 17 C 19 18 18 19 16 19 C 14 19 12 20 10 20 Z M 18 20 L 17 24 M 21 20 L 22 24 M 9 20 L 8 24 M 12 20 L 11 24",
    keyword: "CULTURE",
    patternType: "diagonal",
    accentColor: "hsl(120 50% 55%)",
    continentBase: "hsl(15 25% 18%)",
  },

  // 🇪🇸 Spain — Red-gold gem, Sun of Castile (simplified), Stripes/diagonal
  ES: {
    gemColor: "hsl(25 75% 52%)",
    gemShape: "star",
    // Sun of Castile: circle with 8 pointed rays
    symbolPath: "M 15 8 A 7 7 0 0 1 22 15 A 7 7 0 0 1 15 22 A 7 7 0 0 1 8 15 A 7 7 0 0 1 15 8 Z M 15 3 L 16 7 L 15 5 L 14 7 Z M 15 23 L 16 27 L 15 25 L 14 27 Z M 3 15 L 7 16 L 5 15 L 7 14 Z M 23 15 L 27 16 L 25 15 L 27 14 Z M 6 6 L 9 9 M 21 21 L 24 24 M 24 6 L 21 9 M 6 24 L 9 21",
    keyword: "CONQUETE",
    patternType: "diagonal",
    accentColor: "hsl(45 90% 60%)",
    continentBase: "hsl(0 25% 18%)",
  },
};

// ─── Deterministic fallback DNA ──────────────────────────────────────────────
// Generates stable DNA from the country code hash (no randomness between renders)

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

const GEM_SHAPES: GemShape[] = ["diamond", "hexagon", "circle", "star", "octagon"];
const PATTERN_TYPES: PatternType[] = ["grid", "diagonal", "dots", "waves", "triangles"];

// Continent hue ranges (deterministic from hash)
const CONTINENT_HUES = [200, 140, 30, 355, 45, 0, 280, 160];

export function getDefaultDNA(countryCode: string): PieceDNA {
  const h = hashCode(countryCode);
  const gemHue = (h * 137 + 60) % 360;
  const gemShape = GEM_SHAPES[h % GEM_SHAPES.length];
  const patternType = PATTERN_TYPES[(h * 3) % PATTERN_TYPES.length];
  const baseHue = CONTINENT_HUES[(h * 7) % CONTINENT_HUES.length];

  return {
    gemColor: `hsl(${gemHue} 70% 55%)`,
    gemShape,
    symbolPath: "M 15 5 L 25 25 L 5 25 Z",  // fallback: simple triangle
    keyword: countryCode,
    patternType,
    accentColor: `hsl(${(gemHue + 40) % 360} 60% 75%)`,
    continentBase: `hsl(${baseHue} 25% 18%)`,
  };
}

export function getPieceDNA(countryCode: string): PieceDNA {
  return PIECE_DNA[countryCode] ?? getDefaultDNA(countryCode);
}
