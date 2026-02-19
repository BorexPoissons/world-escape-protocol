// ─── WEP Puzzle Piece — Unique SVG Component per Country ─────────────────────
// Pure SVG, no external dependencies beyond Framer Motion (already installed).
// Each country has a unique gem, symbol, keyword, and micro-pattern.
// Renders correctly at any size via a 100×100 viewBox.

import { motion } from "framer-motion";
import { getPieceDNA, type GemShape, type PatternType } from "@/lib/pieceDNA";

interface WEPPuzzlePieceProps {
  countryCode: string;
  size?: number;
  animated?: boolean;
  showKeyword?: boolean;
  mode?: "inventory" | "detail" | "complete";  // affects animation style
}

// ─── Base puzzle shape (identical for all 195 pieces) ────────────────────────
// 4 connectors: top tab, right tab, bottom blank, left blank
// viewBox: 0 0 100 100 — connectors extend slightly beyond 0-100 range
const PUZZLE_PATH = `
  M 20 0
  L 38 0
  C 36 -2 36 -14 50 -14
  C 64 -14 64 -2 62 0
  L 80 0
  L 80 20
  C 82 18 94 18 94 32
  C 94 46 82 46 80 44
  L 80 62
  C 82 60 94 60 94 74
  C 94 88 82 88 80 86
  L 80 100
  L 62 100
  C 64 102 64 114 50 114
  C 36 114 36 102 38 100
  L 20 100
  L 20 80
  C 18 82 6 82 6 68
  C 6 54 18 54 20 52
  L 20 20
  C 18 22 6 22 6 8
  C 6 -6 18 -6 20 0
  Z
`;

// ─── Gem Shape renderers ──────────────────────────────────────────────────────

const GemDiamond = ({ color, id }: { color: string; id: string }) => (
  <>
    <defs>
      <radialGradient id={`gem-${id}`} cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="white" stopOpacity="0.8" />
        <stop offset="30%" stopColor={color} stopOpacity="0.95" />
        <stop offset="100%" stopColor="hsl(220 30% 5%)" stopOpacity="0.9" />
      </radialGradient>
    </defs>
    {/* Outer facet */}
    <polygon points="50,30 66,50 50,70 34,50" fill={`url(#gem-${id})`} />
    {/* Inner facet (top highlight) */}
    <polygon points="50,34 62,50 50,42 38,50" fill="white" opacity="0.2" />
    {/* Sparkle */}
    <polygon points="50,30 66,50 50,70 34,50" fill="none" stroke="white" strokeWidth="0.5" opacity="0.4" />
  </>
);

const GemHexagon = ({ color, id }: { color: string; id: string }) => {
  const cx = 50, cy = 50, r = 16;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
  const innerPts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${cx + (r * 0.55) * Math.cos(a)},${cy + (r * 0.55) * Math.sin(a)}`;
  }).join(" ");

  return (
    <>
      <defs>
        <radialGradient id={`gem-${id}`} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
          <stop offset="40%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor="hsl(220 30% 5%)" stopOpacity="0.9" />
        </radialGradient>
      </defs>
      <polygon points={pts} fill={`url(#gem-${id})`} />
      <polygon points={innerPts} fill="white" opacity="0.18" />
      <polygon points={pts} fill="none" stroke="white" strokeWidth="0.5" opacity="0.35" />
    </>
  );
};

const GemCircle = ({ color, id }: { color: string; id: string }) => (
  <>
    <defs>
      <radialGradient id={`gem-${id}`} cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="white" stopOpacity="0.85" />
        <stop offset="35%" stopColor={color} stopOpacity="0.95" />
        <stop offset="100%" stopColor="hsl(220 30% 5%)" stopOpacity="0.9" />
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="16" fill={`url(#gem-${id})`} />
    {/* Top-left shine spot */}
    <ellipse cx="44" cy="43" rx="5" ry="3.5" fill="white" opacity="0.4" transform="rotate(-25 44 43)" />
    <circle cx="50" cy="50" r="16" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
  </>
);

const GemStar = ({ color, id }: { color: string; id: string }) => {
  // 5-point star polygon
  const outerR = 16, innerR = 7, cx = 50, cy = 50;
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / 180) * (36 * i - 90);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");

  return (
    <>
      <defs>
        <radialGradient id={`gem-${id}`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="white" stopOpacity="0.75" />
          <stop offset="40%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor="hsl(220 30% 5%)" stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <polygon points={pts} fill={`url(#gem-${id})`} />
      <polygon points={pts} fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
    </>
  );
};

const GemOctagon = ({ color, id }: { color: string; id: string }) => {
  const cx = 50, cy = 50, r = 16;
  const pts = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 180) * (45 * i - 22.5);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");

  return (
    <>
      <defs>
        <radialGradient id={`gem-${id}`} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
          <stop offset="40%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor="hsl(220 30% 5%)" stopOpacity="0.9" />
        </radialGradient>
      </defs>
      <polygon points={pts} fill={`url(#gem-${id})`} />
      <polygon points={pts} fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
    </>
  );
};

function renderGem(shape: GemShape, color: string, id: string) {
  switch (shape) {
    case "diamond":  return <GemDiamond color={color} id={id} />;
    case "hexagon":  return <GemHexagon color={color} id={id} />;
    case "circle":   return <GemCircle  color={color} id={id} />;
    case "star":     return <GemStar    color={color} id={id} />;
    case "octagon":  return <GemOctagon color={color} id={id} />;
  }
}

// ─── Background micro-patterns ───────────────────────────────────────────────

function renderPattern(type: PatternType, id: string, accentColor: string) {
  const patId = `pat-${id}`;
  switch (type) {
    case "grid":
      return (
        <>
          <defs>
            <pattern id={patId} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke={accentColor} strokeWidth="0.4" />
            </pattern>
          </defs>
          <path d={PUZZLE_PATH} fill={`url(#${patId})`} opacity="0.08" />
        </>
      );
    case "diagonal":
      return (
        <>
          <defs>
            <pattern id={patId} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 0 8 L 8 0" stroke={accentColor} strokeWidth="0.5" />
            </pattern>
          </defs>
          <path d={PUZZLE_PATH} fill={`url(#${patId})`} opacity="0.09" />
        </>
      );
    case "dots":
      return (
        <>
          <defs>
            <pattern id={patId} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1" fill={accentColor} />
            </pattern>
          </defs>
          <path d={PUZZLE_PATH} fill={`url(#${patId})`} opacity="0.12" />
        </>
      );
    case "waves":
      return (
        <>
          <defs>
            <pattern id={patId} x="0" y="0" width="16" height="8" patternUnits="userSpaceOnUse">
              <path d="M 0 4 Q 4 0 8 4 Q 12 8 16 4" fill="none" stroke={accentColor} strokeWidth="0.5" />
            </pattern>
          </defs>
          <path d={PUZZLE_PATH} fill={`url(#${patId})`} opacity="0.09" />
        </>
      );
    case "triangles":
      return (
        <>
          <defs>
            <pattern id={patId} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <polygon points="5,1 9,9 1,9" fill="none" stroke={accentColor} strokeWidth="0.5" />
            </pattern>
          </defs>
          <path d={PUZZLE_PATH} fill={`url(#${patId})`} opacity="0.08" />
        </>
      );
  }
}

// ─── Main WEPPuzzlePiece component ───────────────────────────────────────────

export const WEPPuzzlePiece = ({
  countryCode,
  size = 80,
  animated = true,
  showKeyword = true,
  mode = "inventory",
}: WEPPuzzlePieceProps) => {
  const dna = getPieceDNA(countryCode);

  // Unique IDs per instance to avoid SVG defs collision
  const uid = `${countryCode}-${size}`;

  const metalGradId = `metal-${uid}`;
  const shineGradId = `shine-${uid}`;
  const glowFilterId = `glow-${uid}`;
  const gemGlowFilterId = `gemglow-${uid}`;
  const clipId = `clip-${uid}`;

  const Wrapper = animated ? motion.div : "div";

  const animProps = animated
    ? mode === "detail"
      ? {
          animate: { rotateY: [0, 360] },
          transition: { repeat: Infinity, duration: 12, ease: "linear" as const },
          style: { perspective: "600px", display: "inline-block" },
        }
      : mode === "complete"
      ? {
          initial: { scale: 0, y: -60, rotate: -20, opacity: 0 },
          animate: { scale: 1, y: 0, rotate: 0, opacity: 1 },
          transition: { type: "spring" as const, stiffness: 180, damping: 14, delay: 0.2 },
        }
      : {
          // inventory: subtle 3D oscillation
          animate: { rotateY: [-8, 8, -8] },
          transition: { repeat: Infinity, duration: 5, ease: "easeInOut" as const },
          style: { perspective: "500px", display: "inline-block" },
        }
    : {};

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* Gem halo glow */}
      {animated && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 0.45,
            height: size * 0.45,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: dna.gemColor,
            filter: "blur(14px)",
          }}
          animate={{ opacity: [0.15, 0.45, 0.15], scale: [1, 1.25, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        />
      )}

      <Wrapper {...animProps}>
        <svg
          width={size}
          height={size}
          viewBox="-8 -8 116 116"
          overflow="visible"
          style={{ filter: `drop-shadow(0 ${size * 0.07}px ${size * 0.14}px rgba(0,0,0,0.7))` }}
        >
          <defs>
            {/* Metal gradient */}
            <linearGradient id={metalGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.18" />
              <stop offset="20%" stopColor={dna.continentBase} stopOpacity="1" />
              <stop offset="65%" stopColor={dna.continentBase} stopOpacity="0.95" />
              <stop offset="100%" stopColor="hsl(220 30% 6%)" stopOpacity="0.98" />
            </linearGradient>

            {/* Top shine */}
            <linearGradient id={shineGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.28" />
              <stop offset="45%" stopColor="white" stopOpacity="0.05" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            {/* Piece glow filter */}
            <filter id={glowFilterId} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gem glow filter */}
            <filter id={gemGlowFilterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Clip to piece shape */}
            <clipPath id={clipId}>
              <path d={PUZZLE_PATH} />
            </clipPath>
          </defs>

          {/* 1. Shadow */}
          <path
            d={PUZZLE_PATH}
            fill="hsl(220 30% 2%)"
            transform="translate(3 5)"
            opacity="0.6"
          />

          {/* 2. Metal body */}
          <path
            d={PUZZLE_PATH}
            fill={`url(#${metalGradId})`}
            stroke={dna.gemColor}
            strokeWidth="1.2"
            filter={`url(#${glowFilterId})`}
          />

          {/* 3. Micro-pattern (clipped to piece shape) */}
          <g clipPath={`url(#${clipId})`}>
            {renderPattern(dna.patternType, uid, dna.accentColor)}
          </g>

          {/* 4. Inner engraved frame */}
          <rect
            x="18"
            y="18"
            width="64"
            height="64"
            rx="6"
            fill="none"
            stroke={dna.accentColor}
            strokeWidth="0.8"
            opacity="0.25"
            clipPath={`url(#${clipId})`}
          />

          {/* 5+6. Gem + glow */}
          <g filter={`url(#${gemGlowFilterId})`}>
            {renderGem(dna.gemShape, dna.gemColor, uid)}
          </g>

          {/* 7. Central engraved symbol */}
          <g
            transform="translate(35 35) scale(0.667)"
            fill="none"
            stroke={dna.accentColor}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.55"
          >
            <path d={dna.symbolPath} />
          </g>

          {/* 8. Keyword engraved at bottom */}
          {showKeyword && (
            <text
              x="50"
              y="88"
              textAnchor="middle"
              fontFamily="monospace"
              fontSize="5.5"
              fill={dna.accentColor}
              opacity="0.55"
              letterSpacing="1.5"
            >
              {dna.keyword}
            </text>
          )}

          {/* 9. Top shine overlay */}
          <path
            d={PUZZLE_PATH}
            fill={`url(#${shineGradId})`}
            opacity="0.7"
          />

          {/* 10. Fine engraved border */}
          <path
            d={PUZZLE_PATH}
            fill="none"
            stroke={dna.accentColor}
            strokeWidth="0.6"
            opacity="0.3"
            strokeDasharray="3 4"
          />
        </svg>
      </Wrapper>

      {/* Country code label (for inventory mode) */}
      {mode === "inventory" && (
        <p
          className="font-display tracking-widest mt-1"
          style={{
            color: dna.gemColor,
            fontSize: `${Math.max(8, size * 0.14)}px`,
            textShadow: `0 0 8px ${dna.gemColor}88`,
          }}
        >
          {countryCode}
        </p>
      )}
    </div>
  );
};

export default WEPPuzzlePiece;
