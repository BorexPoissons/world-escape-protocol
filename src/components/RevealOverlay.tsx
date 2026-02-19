/**
 * RevealOverlay — Système de révélation progressive de la carte mondiale
 *
 * Piloté uniquement par `globalProgress` (0–100 %).
 * Chaque seuil débloque une couche visuelle narrative supplémentaire.
 * Aucun changement d'image brute — tout est CSS / SVG / canvas overlay.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";

interface RevealOverlayProps {
  globalProgress: number; // 0–100
}

// ── Intercontinental connection arcs (SVG viewBox 0 0 100 56.25) ─────────────
// Expressed as [x1%, y1%, x2%, y2%] — positions in the 100×56.25 coordinate space
const INTERCONTINENTAL_LINES_10: Array<[number, number, number, number, string]> = [
  // Europe ↔ North America
  [51, 14.9, 22, 18.2, "hsl(220 80% 65%)"],
  // Asia ↔ Middle East
  [71, 23.7, 57, 25.3, "hsl(40 80% 60%)"],
];

const INTERCONTINENTAL_LINES_25: Array<[number, number, number, number, string]> = [
  // Finance axis: Switzerland ↔ New York ↔ Tokyo
  [51, 14.9, 83, 18.0, "hsl(40 90% 65%)"],
  // Energy axis: Middle East ↔ Russia ↔ China
  [57, 25.3, 65, 11.8, "hsl(280 65% 62%)"],
  [65, 11.8, 77.8, 23.7, "hsl(280 65% 62%)"],
  // Tech axis: US ↔ India ↔ China
  [22, 18.2, 64.8, 29.2, "hsl(160 60% 52%)"],
];

const INTERCONTINENTAL_LINES_50: Array<[number, number, number, number, string]> = [
  // North–South axis
  [22, 18.2, 31.9, 31.9, "hsl(40 70% 55%)"],
  [51, 14.9, 55, 40.0, "hsl(40 70% 55%)"],
  [77.8, 23.7, 80, 37.8, "hsl(40 70% 55%)"],
  // East–West axis
  [22, 18.2, 51, 14.9, "hsl(160 55% 48%)"],
  [51, 14.9, 77.8, 23.7, "hsl(160 55% 48%)"],
  // Southern hemisphere
  [31.9, 31.9, 55, 40.0, "hsl(220 70% 58%)"],
  [55, 40.0, 80, 37.8, "hsl(220 70% 58%)"],
];

const INTERCONTINENTAL_LINES_75: Array<[number, number, number, number, string]> = [
  // Dense web — major hubs connecting everything
  [22, 18.2, 80, 37.8, "hsl(0 65% 55%)"],
  [31.9, 31.9, 80, 37.8, "hsl(0 65% 55%)"],
  [51, 14.9, 55, 40.0, "hsl(0 65% 55%)"],
  [64.8, 29.2, 31.9, 31.9, "hsl(0 65% 55%)"],
  [77.8, 23.7, 55, 40.0, "hsl(0 65% 55%)"],
];

// Strategic pulsing nodes at 75%+ (x%, y%)
const STRATEGIC_NODES: Array<{ x: number; y: number; label: string; color: string }> = [
  { x: 22.0, y: 18.2, label: "NODE α", color: "hsl(0 70% 58%)" },
  { x: 77.8, y: 23.7, label: "NODE β", color: "hsl(0 70% 58%)" },
  { x: 51.0, y: 14.9, label: "NODE γ", color: "hsl(0 70% 58%)" },
  { x: 64.8, y: 29.2, label: "NODE δ", color: "hsl(0 70% 58%)" },
  { x: 31.9, y: 31.9, label: "NODE ε", color: "hsl(0 70% 58%)" },
];

// Zone glow areas at 25% (Finance, Energy, Technology)
const ZONE_GLOWS_25: Array<{ cx: number; cy: number; rx: number; ry: number; color: string; label: string }> = [
  { cx: 51,   cy: 14.9, rx: 12, ry: 7,  color: "hsl(40 90% 55%)",  label: "FINANCE" },
  { cx: 65,   cy: 20,   rx: 10, ry: 6,  color: "hsl(280 65% 55%)", label: "ÉNERGIE" },
  { cx: 72,   cy: 25,   rx: 9,  ry: 5,  color: "hsl(160 60% 50%)", label: "TECH" },
];

// Random sparkle positions for 0–9% (% of 100×56.25 viewbox)
const SPARKLE_POSITIONS = [
  { x: 22, y: 18 }, { x: 51, y: 15 }, { x: 77, y: 24 },
  { x: 64, y: 29 }, { x: 32, y: 32 }, { x: 55, y: 40 },
  { x: 45, y: 20 }, { x: 38, y: 10 }, { x: 88, y: 38 },
  { x: 12, y: 35 }, { x: 60, y: 8 },  { x: 25, y: 48 },
];

// ── Helper: animated path between two points ──────────────────────────────────
function ArcLine({
  x1, y1, x2, y2, color, delay = 0, strokeWidth = 0.3,
}: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; delay?: number; strokeWidth?: number;
}) {
  const mx = (x1 + x2) / 2;
  const my = Math.min(y1, y2) - 6;
  const d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeOpacity={0.65}
      filter="url(#revealGlow)"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 2.5, delay, ease: "easeInOut" }}
    />
  );
}

// ── Sparkle dot ───────────────────────────────────────────────────────────────
function Sparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <motion.circle
      cx={x} cy={y} r={0.4}
      fill="hsl(40 90% 75%)"
      filter="url(#revealGlow)"
      animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.5, 0.5] }}
      transition={{ duration: 2.2 + delay * 0.3, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RevealOverlay({ globalProgress }: RevealOverlayProps) {
  const prevProgress = useRef(globalProgress);

  useEffect(() => {
    prevProgress.current = globalProgress;
  }, [globalProgress]);

  const pct = globalProgress;

  // Compute brightness threshold state
  const state =
    pct >= 100 ? "complete" :
    pct >= 99  ? "almost" :
    pct >= 75  ? "convergence" :
    pct >= 50  ? "network" :
    pct >= 25  ? "structure" :
    pct >= 10  ? "first_pattern" : "signal";

  // ── SVG viewBox matches CinematicWorldMap: 100 × 56.25 ────────────────────
  return (
    <>
      {/* ── SVG overlay: all arc lines, glows, sparkles ── */}
      <svg
        viewBox="0 0 100 56.25"
        className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="revealGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="zoneFinance" cx="50%" cy="50%">
            <stop offset="0%" stopColor="hsl(40 90% 55%)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(40 90% 55%)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="zoneEnergie" cx="50%" cy="50%">
            <stop offset="0%" stopColor="hsl(280 65% 55%)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(280 65% 55%)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="zoneTech" cx="50%" cy="50%">
            <stop offset="0%" stopColor="hsl(160 60% 50%)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(160 60% 50%)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="centralSymbol" cx="50%" cy="50%">
            <stop offset="0%" stopColor="hsl(0 70% 58%)" stopOpacity="0.35" />
            <stop offset="50%" stopColor="hsl(0 70% 45%)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="hsl(0 70% 45%)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── 0–9%: Random anomaly sparkles ── */}
        {SPARKLE_POSITIONS.map((s, i) => (
          <Sparkle key={i} x={s.x} y={s.y * 0.5625} delay={i * 0.37} />
        ))}

        {/* ── 10%+: First intercontinental lines ── */}
        <AnimatePresence>
          {pct >= 10 && INTERCONTINENTAL_LINES_10.map(([x1, y1, x2, y2, color], i) => (
            <ArcLine
              key={`l10-${i}`}
              x1={x1} y1={y1 * 0.5625} x2={x2} y2={y2 * 0.5625}
              color={color} delay={i * 0.5} strokeWidth={0.28}
            />
          ))}
        </AnimatePresence>

        {/* ── 25%+: Zone glows (Finance, Énergie, Tech) ── */}
        <AnimatePresence>
          {pct >= 25 && (
            <>
              <motion.ellipse
                cx={51} cy={14.9 * 0.5625} rx={12} ry={4}
                fill="url(#zoneFinance)"
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <motion.ellipse
                cx={65} cy={20 * 0.5625} rx={10} ry={3.5}
                fill="url(#zoneEnergie)"
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, delay: 0.4, ease: "easeOut" }}
              />
              <motion.ellipse
                cx={72} cy={25 * 0.5625} rx={9} ry={3}
                fill="url(#zoneTech)"
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
              />
            </>
          )}
        </AnimatePresence>

        {/* ── 25%+: Second wave of connection lines ── */}
        <AnimatePresence>
          {pct >= 25 && INTERCONTINENTAL_LINES_25.map(([x1, y1, x2, y2, color], i) => (
            <ArcLine
              key={`l25-${i}`}
              x1={x1} y1={y1 * 0.5625} x2={x2} y2={y2 * 0.5625}
              color={color} delay={0.3 + i * 0.4} strokeWidth={0.22}
            />
          ))}
        </AnimatePresence>

        {/* ── 50%+: Dense network (N-S and E-W axes) ── */}
        <AnimatePresence>
          {pct >= 50 && INTERCONTINENTAL_LINES_50.map(([x1, y1, x2, y2, color], i) => (
            <ArcLine
              key={`l50-${i}`}
              x1={x1} y1={y1 * 0.5625} x2={x2} y2={y2 * 0.5625}
              color={color} delay={0.2 + i * 0.3} strokeWidth={0.3}
            />
          ))}
        </AnimatePresence>

        {/* ── 75%+: Convergence arcs (glowing red) ── */}
        <AnimatePresence>
          {pct >= 75 && INTERCONTINENTAL_LINES_75.map(([x1, y1, x2, y2, color], i) => (
            <ArcLine
              key={`l75-${i}`}
              x1={x1} y1={y1 * 0.5625} x2={x2} y2={y2 * 0.5625}
              color={color} delay={0.1 + i * 0.25} strokeWidth={0.38}
            />
          ))}
        </AnimatePresence>

        {/* ── 75%+: Strategic nodes pulsing ── */}
        <AnimatePresence>
          {pct >= 75 && STRATEGIC_NODES.map((n, i) => (
            <motion.g key={`sn-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.3 }}>
              <motion.circle
                cx={n.x} cy={n.y * 0.5625} r={1.8}
                fill="none" stroke={n.color} strokeWidth={0.22}
                filter="url(#revealGlow)"
                animate={{ r: [1.8, 3.2, 1.8], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
              />
              <circle cx={n.x} cy={n.y * 0.5625} r={0.5} fill={n.color} filter="url(#revealGlow)" />
            </motion.g>
          ))}
        </AnimatePresence>

        {/* ── 75%+: Central blurry symbol (circle + inner cross) ── */}
        <AnimatePresence>
          {pct >= 75 && (
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: pct >= 100 ? 1 : 0.45, scale: 1 }}
              style={{ transformOrigin: "50px 28.125px" }}
              transition={{ duration: 2, ease: "easeOut" }}
            >
              <circle cx={50} cy={28.125} r={14} fill="url(#centralSymbol)" filter="url(#softGlow)" />
              {/* Outer ring */}
              <motion.circle
                cx={50} cy={28.125} r={12}
                fill="none" stroke="hsl(0 65% 48%)" strokeWidth={0.18}
                strokeDasharray={pct >= 100 ? "none" : "1.5 1.5"}
                strokeOpacity={pct >= 100 ? 0.65 : 0.35}
                filter="url(#softGlow)"
                animate={pct >= 75 && pct < 100 ? { rotate: [0, 360] } : {}}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                style={{ transformOrigin: "50px 28.125px" }}
              />
              {/* Inner structure (cross lines) — blurry until 100% */}
              <line x1={50} y1={18.125} x2={50} y2={38.125} stroke="hsl(0 65% 50%)"
                strokeWidth={pct >= 100 ? 0.22 : 0.12}
                strokeOpacity={pct >= 100 ? 0.6 : 0.2} filter="url(#softGlow)" />
              <line x1={40} y1={28.125} x2={60} y2={28.125} stroke="hsl(0 65% 50%)"
                strokeWidth={pct >= 100 ? 0.22 : 0.12}
                strokeOpacity={pct >= 100 ? 0.6 : 0.2} filter="url(#softGlow)" />
              {/* Pentagon of 5 strategic dots */}
              {[0, 72, 144, 216, 288].map((angle, i) => {
                const rad = (angle - 90) * (Math.PI / 180);
                const px = 50 + 7.5 * Math.cos(rad);
                const py = 28.125 + 7.5 * Math.sin(rad);
                return (
                  <motion.circle
                    key={i} cx={px} cy={py} r={0.6}
                    fill="hsl(0 70% 62%)"
                    filter="url(#revealGlow)"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.36 }}
                  />
                );
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── 99%: Slow-zoom handled via parent CSS ── */}

        {/* ── 100%: Full reveal — additional web of lines ── */}
        <AnimatePresence>
          {pct >= 100 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 2 }}>
              {/* Dense closing lines */}
              {STRATEGIC_NODES.map((from, i) =>
                STRATEGIC_NODES.slice(i + 1).map((to, j) => {
                  const d = `M ${from.x} ${from.y * 0.5625} L ${to.x} ${to.y * 0.5625}`;
                  return (
                    <motion.path
                      key={`final-${i}-${j}`}
                      d={d} fill="none" stroke="hsl(0 70% 55%)" strokeWidth={0.16}
                      strokeOpacity={0.4} filter="url(#revealGlow)"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.5, delay: (i + j) * 0.25 }}
                    />
                  );
                })
              )}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* ── Narrative state label (HUD bottom-center) ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.6 }}
          className="absolute bottom-3 left-1/2 z-[15] pointer-events-none"
          style={{ transform: "translateX(-50%)" }}
        >
          <div
            className="text-[9px] font-display tracking-[0.22em] px-3 py-[3px] rounded-full border backdrop-blur-sm whitespace-nowrap"
            style={{
              background: "hsl(220 25% 4% / 0.78)",
              borderColor: state === "complete" ? "hsl(0 65% 48% / 0.6)"
                : state === "convergence" || state === "almost" ? "hsl(0 55% 38% / 0.5)"
                : "hsl(40 80% 55% / 0.2)",
              color: state === "complete" ? "hsl(0 70% 65%)"
                : state === "convergence" || state === "almost" ? "hsl(0 55% 58%)"
                : "hsl(40 65% 55%)",
              boxShadow: state === "complete" ? "0 0 18px hsl(0 65% 48% / 0.35)"
                : "none",
            }}
          >
            {state === "signal"       && "◌ DES ANOMALIES APPARAISSENT…"}
            {state === "first_pattern" && "◈ PREMIER MOTIF DÉTECTÉ"}
            {state === "structure"    && "◉ STRUCTURE ÉMERGENTE · CE N'EST PAS ALÉATOIRE"}
            {state === "network"      && "⬡ RÉSEAU GLOBAL · L'AXE EST VISIBLE"}
            {state === "convergence"  && "⬢ CONVERGENCE · TOUT CONVERGE"}
            {state === "almost"       && "⬢ PRESQUE… UN FRAGMENT MANQUANT"}
            {state === "complete"     && "✦ RÉVÉLATION TOTALE · LE PLAN EST COMPLET"}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Zone labels at 25%+ ── */}
      <AnimatePresence>
        {pct >= 25 && pct < 100 && (
          <>
            {[
              { label: "FINANCE", left: "49%",  top: "22%", color: "hsl(40 90% 62%)" },
              { label: "ÉNERGIE", left: "63%",  top: "36%", color: "hsl(280 65% 65%)" },
              { label: "TECH",    left: "72%",  top: "43%", color: "hsl(160 60% 55%)" },
            ].map((z, i) => (
              <motion.div
                key={z.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.5, duration: 1 }}
                className="absolute z-[6] pointer-events-none text-[7px] font-display tracking-[0.2em]"
                style={{ left: z.left, top: z.top, color: z.color, opacity: 0.55 }}
              >
                {z.label}
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* ── 99%: Slow zoom overlay ── */}
      <AnimatePresence>
        {pct >= 99 && pct < 100 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[8] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 20%, hsl(0 60% 4% / 0.3) 100%)" }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
