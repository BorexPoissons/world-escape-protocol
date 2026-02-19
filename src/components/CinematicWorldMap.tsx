import { motion, AnimatePresence } from "framer-motion";
import carteWep from "@/assets/carte-wep.png";

export interface MapCountry {
  id: string;
  name: string;
  code: string;
  unlockedPieces: number;
  totalPieces: number;
  visibility: "playable" | "locked_upgrade" | "silhouette" | "hidden";
  x: number; // % left (puzzle_position_x)
  y: number; // % top  (puzzle_position_y)
  seasonNumber?: number;
  isFree?: boolean;
}

interface CinematicWorldMapProps {
  countries: MapCountry[];
  draggingFragmentId: string | null;
  placedCountryIds: string[];
  onDropOnCountry: (countryId: string) => void;
  onCountryClick: (country: MapCountry) => void;
}

// Fallback geo positions (used if puzzle_position_x/y not yet in DB)
export const COUNTRY_GEO: Record<string, { x: number; y: number }> = {
  // Season 0 — Official validated coords
  CH: { x: 52.5, y: 26.5 },
  BR: { x: 31.9, y: 56.7 },
  CN: { x: 77.8, y: 42.2 },
  US: { x: 22.0, y: 32.3 },
  IN: { x: 64.8, y: 51.8 },
  // Season 1 — approximate
  JP: { x: 83,   y: 32   },
  EG: { x: 57,   y: 45   },
  ES: { x: 46,   y: 36   },
  GR: { x: 54,   y: 37   },
  IT: { x: 52,   y: 36   },
  FR: { x: 48,   y: 31   },
  MA: { x: 46,   y: 43   },
  RU: { x: 65,   y: 21   },
  DE: { x: 51,   y: 28   },
  GB: { x: 47,   y: 26   },
  CA: { x: 16,   y: 23   },
  AU: { x: 80,   y: 67   },
  MX: { x: 15,   y: 43   },
  ZA: { x: 55,   y: 71   },
  TR: { x: 58,   y: 35   },
  AR: { x: 28,   y: 75   },
  KR: { x: 80,   y: 34   },
};

// Narrative connections between the 5 free countries
const FREE_CONNECTIONS: [string, string][] = [
  ["CH", "US"],
  ["CH", "CN"],
  ["US", "BR"],
  ["CN", "IN"],
  ["BR", "IN"],
];

const FLAG_EMOJI: Record<string, string> = {
  CH: "🇨🇭", JP: "🇯🇵", EG: "🇪🇬", FR: "🇫🇷", DE: "🇩🇪",
  IT: "🇮🇹", ES: "🇪🇸", GB: "🇬🇧", BR: "🇧🇷", US: "🇺🇸",
  CA: "🇨🇦", AU: "🇦🇺", CN: "🇨🇳", IN: "🇮🇳", MX: "🇲🇽",
  RU: "🇷🇺", ZA: "🇿🇦", MA: "🇲🇦", TR: "🇹🇷", AR: "🇦🇷",
  KR: "🇰🇷", GR: "🇬🇷",
};

const FREE_COUNTRY_CODES = new Set(["CH", "BR", "CN", "US", "IN"]);

const CinematicWorldMap = ({
  countries,
  draggingFragmentId,
  placedCountryIds,
  onDropOnCountry,
  onCountryClick,
}: CinematicWorldMapProps) => {
  const playableNodes = countries.filter(c => c.visibility === "playable");
  const silhouetteNodes = countries.filter(c => c.visibility === "silhouette");
  const lockedNodes = countries.filter(c => c.visibility === "locked_upgrade");

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{
        aspectRatio: "16 / 9",
        border: "1px solid hsl(40 80% 55% / 0.25)",
        boxShadow: "0 0 60px hsl(40 80% 55% / 0.08)",
      }}
    >
      {/* ── Background: official WEP map image ── */}
      <img
        src={carteWep}
        alt="Carte World Escape Protocol"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: "brightness(0.72) saturate(0.8)" }}
        draggable={false}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, transparent 35%, hsl(220 25% 4% / 0.55) 100%)",
        }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(220 15% 4%) 2px, hsl(220 15% 4%) 4px)",
        }}
      />

      {/* ── SVG layer: connection lines only ──
          Uses preserveAspectRatio="none" so SVG coords map 1:1 to % of container.
          x in SVG = x% of width, y in SVG = y * 0.5625 (16:9 ratio) */}
      <svg
        viewBox="0 0 100 56.25"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="lineGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="hsl(40 90% 65%)" stopOpacity="0.04" />
            <stop offset="50%"  stopColor="hsl(40 90% 72%)" stopOpacity="0.88" />
            <stop offset="100%" stopColor="hsl(40 90% 65%)" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {FREE_CONNECTIONS.map(([fromCode, toCode], idx) => {
          const from = countries.find(c => c.code === fromCode);
          const to   = countries.find(c => c.code === toCode);
          if (!from || !to) return null;

          // y scaled: position% → SVG units (100% height = 56.25 units)
          const x1 = from.x,       y1 = from.y * 0.5625;
          const x2 = to.x,         y2 = to.y   * 0.5625;
          const qx = (x1 + x2) / 2;
          const qy = Math.min(y1, y2) - 5;
          const d  = `M ${x1} ${y1} Q ${qx} ${qy} ${x2} ${y2}`;
          const active = from.unlockedPieces > 0 && to.unlockedPieces > 0;

          return (
            <g key={idx}>
              {/* Dim dashed baseline */}
              <path d={d} fill="none" stroke="hsl(40 50% 45% / 0.18)" strokeWidth="0.22" strokeDasharray="0.9 0.9" />

              {active && (
                <>
                  <motion.path
                    d={d} fill="none"
                    stroke="url(#goldLine)"
                    strokeWidth="0.45"
                    strokeLinecap="round"
                    filter="url(#lineGlow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2, delay: 0.35 * idx, ease: "easeInOut" }}
                  />
                  <motion.circle
                    r="0.55" fill="hsl(40 90% 82%)"
                    filter="url(#lineGlow)"
                    animate={{ offsetDistance: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
                    style={{ offsetPath: `path("${d}")` } as any}
                    transition={{ duration: 3.5, repeat: Infinity, delay: idx * 1.3, ease: "linear" }}
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* ── CSS-positioned nodes ──
          left: x%  top: y%  transform: translate(-50%,-50%)
          This is the responsive-correct system for 195 countries */}

      {/* Silhouette nodes */}
      {silhouetteNodes.map((node) => (
        <div
          key={node.id}
          className="absolute pointer-events-none"
          style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%,-50%)" }}
        >
          <div className="w-6 h-6 rounded-full border border-dashed flex items-center justify-center text-[10px] opacity-20"
            style={{ borderColor: "hsl(220 15% 25%)", background: "hsl(220 15% 8%)", color: "hsl(220 10% 35%)" }}>
            ?
          </div>
        </div>
      ))}

      {/* Locked upgrade nodes */}
      {lockedNodes.map((node) => (
        <div
          key={node.id}
          className="absolute flex flex-col items-center gap-0.5 pointer-events-none"
          style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%,-50%)" }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm border border-dashed opacity-60"
            style={{ borderColor: "hsl(40 50% 28%)", background: "hsl(40 20% 7%)" }}>
            🔒
          </div>
          <span className="text-[8px] font-display tracking-wider opacity-60 whitespace-nowrap"
            style={{ color: "hsl(40 50% 38%)" }}>
            SAISON 1
          </span>
        </div>
      ))}

      {/* Playable nodes — the real interactive nodes */}
      {playableNodes.map((node, i) => {
        const isFree    = FREE_COUNTRY_CODES.has(node.code);
        const isComplete = node.unlockedPieces >= node.totalPieces;
        const hasAny    = node.unlockedPieces > 0;
        const wasPlaced = placedCountryIds.includes(node.id);
        const isDropTarget = draggingFragmentId !== null;

        const borderColor = isComplete
          ? "hsl(40 85% 65%)"
          : isFree ? "hsl(40 70% 50%)"
          : "hsl(220 15% 28%)";

        const bgColor = isComplete
          ? "hsl(40 50% 13%)"
          : isFree ? "hsl(220 22% 11%)"
          : "hsl(220 18% 9%)";

        const labelColor = isComplete
          ? "hsl(40 85% 70%)"
          : isFree ? "hsl(40 65% 62%)"
          : "hsl(220 10% 50%)";

        return (
          <motion.div
            key={node.id}
            className="absolute"
            style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%,-50%)" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 * i, type: "spring", stiffness: 260, damping: 22 }}
          >
            {/* Ambient halo — free countries */}
            {isFree && (
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: "-14px",
                  background: "radial-gradient(circle, hsl(40 80% 55% / 0.2) 0%, transparent 70%)",
                }}
                animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0.85, 0.4] }}
                transition={{ repeat: Infinity, duration: 3.2, delay: i * 0.55, ease: "easeInOut" }}
              />
            )}

            {/* Drop pulse ring */}
            {isDropTarget && (
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: "-10px",
                  border: "1.5px solid hsl(40 80% 55%)",
                  background: "hsl(40 80% 55% / 0.07)",
                }}
                animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.85, 0.35] }}
                transition={{ repeat: Infinity, duration: 1.1 }}
              />
            )}

            <button
              className="relative flex flex-col items-center gap-1 group outline-none"
              onClick={() => onCountryClick(node)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onDropOnCountry(node.id); }}
            >
              {/* GRATUIT badge */}
              {isFree && (
                <div
                  className="text-[7px] font-display tracking-widest px-1.5 py-[1px] rounded-full border whitespace-nowrap"
                  style={{
                    background: "hsl(40 80% 55% / 0.15)",
                    borderColor: "hsl(40 80% 55% / 0.55)",
                    color: "hsl(40 85% 72%)",
                    boxShadow: "0 0 6px hsl(40 80% 55% / 0.25)",
                  }}
                >
                  GRATUIT
                </div>
              )}

              {/* Main circle */}
              <div
                className="relative w-9 h-9 rounded-full flex items-center justify-center border-2 transition-transform duration-150 group-hover:scale-110"
                style={{
                  background: bgColor,
                  borderColor,
                  boxShadow: (isFree || isComplete)
                    ? `0 0 12px ${borderColor}, 0 0 3px ${borderColor}`
                    : "none",
                }}
              >
                {/* SVG progress ring */}
                {hasAny && !isComplete && (
                  <svg
                    className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                    viewBox="0 0 36 36"
                  >
                    <circle
                      cx="18" cy="18" r="16"
                      fill="none"
                      stroke="hsl(40 85% 60%)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={`${(node.unlockedPieces / node.totalPieces) * 100.5} 100.5`}
                    />
                  </svg>
                )}

                <span className="text-base leading-none">{FLAG_EMOJI[node.code] || "🌍"}</span>

                {/* Placed checkmark */}
                {wasPlaced && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold"
                    style={{ background: "hsl(140 60% 40%)", border: "1px solid hsl(140 60% 60%)" }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                  >
                    ✓
                  </motion.div>
                )}
              </div>

              {/* Label */}
              <div className="flex flex-col items-center gap-[2px]">
                <span
                  className="text-[8px] font-display tracking-wide leading-none whitespace-nowrap"
                  style={{ color: labelColor, textShadow: "0 1px 4px hsl(220 30% 3%)" }}
                >
                  {node.name.length > 8 ? node.name.substring(0, 7).toUpperCase() + "." : node.name.toUpperCase()}
                </span>
                <span
                  className="text-[7px] font-display tabular-nums px-1 rounded leading-none"
                  style={{
                    background: "hsl(220 20% 8% / 0.85)",
                    color: isComplete ? "hsl(40 80% 65%)" : "hsl(220 10% 48%)",
                    border: "1px solid hsl(220 15% 16%)",
                  }}
                >
                  {node.unlockedPieces}/{node.totalPieces}
                </span>
              </div>
            </button>
          </motion.div>
        );
      })}

      {/* Omega Fragment — fixed at bottom-center */}
      <div
        className="absolute flex flex-col items-center gap-[3px] pointer-events-none"
        style={{ left: "50%", top: "85%", transform: "translate(-50%,-50%)" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm border"
          style={{
            background: "hsl(280 40% 6%)",
            borderColor: "hsl(280 50% 25%)",
            boxShadow: "0 0 10px hsl(280 50% 25% / 0.35)",
          }}
        >
          Ω
        </div>
        <span className="text-[7px] font-display tracking-widest" style={{ color: "hsl(280 40% 42%)" }}>
          OMÉGA
        </span>
      </div>

      {/* ── HUD ── */}
      <div className="absolute top-3 left-3 pointer-events-none">
        <div
          className="text-[10px] font-display tracking-widest px-2 py-[3px] rounded border backdrop-blur-sm"
          style={{
            background: "hsl(220 25% 4% / 0.75)",
            borderColor: "hsl(40 80% 55% / 0.2)",
            color: "hsl(40 70% 60%)",
          }}
        >
          CARTE OPÉRATIONNELLE
        </div>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[10px] font-display tracking-wider" style={{ color: "hsl(40 70% 60%)" }}>
          EN DIRECT
        </span>
      </div>

      <div className="absolute bottom-3 left-3 pointer-events-none">
        <div
          className="flex items-center gap-1.5 text-[10px] font-display tracking-wider px-2 py-[3px] rounded border backdrop-blur-sm"
          style={{
            background: "hsl(40 80% 55% / 0.08)",
            borderColor: "hsl(40 80% 55% / 0.22)",
            color: "hsl(40 80% 65%)",
          }}
        >
          <span>✦</span>
          <span>5 PAYS GRATUITS ACTIFS</span>
        </div>
      </div>

      <AnimatePresence>
        {draggingFragmentId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-3 right-3 text-[10px] font-display tracking-wider px-2.5 py-1.5 rounded border backdrop-blur-sm"
            style={{
              background: "hsl(40 80% 55% / 0.14)",
              borderColor: "hsl(40 80% 55% / 0.45)",
              color: "hsl(40 85% 70%)",
            }}
          >
            ↓ DÉPOSEZ SUR UN PAYS
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CinematicWorldMap;
