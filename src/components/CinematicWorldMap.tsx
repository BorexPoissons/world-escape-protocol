import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import carteWep from "@/assets/carte-wep.png";
import RevealOverlay from "@/components/RevealOverlay";

export interface MapCountry {
  id: string;
  name: string;
  code: string;
  unlockedPieces: number;
  totalPieces: number;
  visibility: "playable" | "locked_s1" | "locked_s2" | "locked_s3" | "locked_s4" | "locked_upgrade" | "silhouette" | "hidden";
  x: number;
  y: number;
  seasonNumber?: number;
  isFree?: boolean;
}

interface CinematicWorldMapProps {
  countries: MapCountry[];
  draggingFragmentId: string | null;
  placedCountryIds: string[];
  onDropOnCountry: (countryId: string) => void;
  onDropOnMap?: (dropX: number, dropY: number) => void;
  onCountryClick: (country: MapCountry) => void;
  globalProgress?: number;
  collectedCountryCodes?: string[];
  forceFullReveal?: boolean;
  snapTargetId?: string | null; // country id that just got snapped — triggers glow
}

// Fallback geo positions
export const COUNTRY_GEO: Record<string, { x: number; y: number }> = {
  CH: { x: 52.5, y: 26.5 }, BR: { x: 31.9, y: 56.7 }, CN: { x: 77.8, y: 42.2 },
  US: { x: 22.0, y: 32.3 }, IN: { x: 64.8, y: 51.8 }, JP: { x: 83, y: 32 },
  EG: { x: 57, y: 45 }, ES: { x: 46, y: 36 }, GR: { x: 54, y: 37 },
  IT: { x: 52, y: 36 }, FR: { x: 48, y: 31 }, MA: { x: 46, y: 43 },
  RU: { x: 65, y: 21 }, DE: { x: 51, y: 28 }, GB: { x: 47, y: 26 },
  CA: { x: 16, y: 23 }, AU: { x: 80, y: 67 }, MX: { x: 15, y: 43 },
  ZA: { x: 55, y: 71 }, TR: { x: 58, y: 35 }, AR: { x: 28, y: 75 },
  KR: { x: 80, y: 34 },
};

const FREE_CONNECTIONS: [string, string][] = [
  ["CH", "US"], ["CH", "CN"], ["US", "BR"], ["CN", "IN"], ["BR", "IN"],
];

export const FLAG_EMOJI: Record<string, string> = {
  CH: "🇨🇭", JP: "🇯🇵", EG: "🇪🇬", FR: "🇫🇷", DE: "🇩🇪",
  IT: "🇮🇹", ES: "🇪🇸", GB: "🇬🇧", BR: "🇧🇷", US: "🇺🇸",
  CA: "🇨🇦", AU: "🇦🇺", CN: "🇨🇳", IN: "🇮🇳", MX: "🇲🇽",
  RU: "🇷🇺", ZA: "🇿🇦", MA: "🇲🇦", TR: "🇹🇷", AR: "🇦🇷",
  KR: "🇰🇷", GR: "🇬🇷", NL: "🇳🇱", SE: "🇸🇪", PL: "🇵🇱",
  PT: "🇵🇹", NO: "🇳🇴", BE: "🇧🇪", AT: "🇦🇹", TH: "🇹🇭",
  ID: "🇮🇩", PK: "🇵🇰", NG: "🇳🇬", SA: "🇸🇦", SG: "🇸🇬",
  MY: "🇲🇾", PH: "🇵🇭", CO: "🇨🇴", CL: "🇨🇱", VN: "🇻🇳",
  UA: "🇺🇦", IR: "🇮🇷", DZ: "🇩🇿", PE: "🇵🇪", CZ: "🇨🇿",
  RO: "🇷🇴", HU: "🇭🇺", IL: "🇮🇱",
};

const FREE_COUNTRY_CODES = new Set(["CH", "BR", "CN", "US", "IN"]);

const SEASON_CONFIG: Record<number, { label: string; codename: string; color: string; lockColor: string }> = {
  0: { label: "SIGNAL INITIAL",   codename: "OP-00 · GRATUIT",  color: "hsl(40 85% 62%)",  lockColor: "hsl(40 80% 55% / 0.6)" },
  1: { label: "PROTOCOLE OMÉGA",  codename: "OP-01",             color: "hsl(220 80% 65%)", lockColor: "hsl(220 70% 45% / 0.7)" },
  2: { label: "RÉSEAU ATLAS",     codename: "OP-02",             color: "hsl(160 60% 52%)", lockColor: "hsl(160 60% 35% / 0.6)" },
  3: { label: "DOMINION SHADOW",  codename: "OP-03",             color: "hsl(280 65% 62%)", lockColor: "hsl(280 60% 40% / 0.6)" },
  4: { label: "CONVERGENCE 195",  codename: "OP-04 · FINALE",    color: "hsl(0 70% 58%)",   lockColor: "hsl(0 65% 35% / 0.6)" },
};

function getSeasonTooltip(season: number): string {
  if (season === 1) return "🔒 PROTOCOLE OMÉGA · 43 pays";
  if (season === 2) return "🔒 RÉSEAU ATLAS · 50 pays";
  if (season === 3) return "🔒 DOMINION SHADOW · 50 pays";
  if (season === 4) return "🔒 CONVERGENCE 195 · 47 pays";
  return "Verrouillé";
}

// ── Locked node ────────────────────────────────────────────────────────────────
const LockedNode = ({ node }: { node: MapCountry }) => {
  const [hovered, setHovered] = useState(false);
  const season = node.seasonNumber ?? 1;
  const cfg = SEASON_CONFIG[season] ?? SEASON_CONFIG[1];

  return (
    <div
      className="absolute z-10"
      style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%,-50%)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 mb-2 z-50 pointer-events-none"
            style={{ transform: "translateX(-50%)" }}
          >
              <div
                className="px-2 py-1.5 rounded-lg border backdrop-blur-md whitespace-nowrap text-center"
                style={{
                  background: "hsl(220 25% 6% / 0.95)",
                  borderColor: cfg.lockColor,
                  boxShadow: `0 0 12px ${cfg.lockColor}`,
                }}
              >
                <p className="text-[8px] font-display tracking-wider mb-0.5" style={{ color: cfg.color }}>
                  {node.name.toUpperCase()}
                </p>
                <p className="text-[7px] font-display tracking-wide" style={{ color: "hsl(220 10% 45%)" }}>
                  {cfg.codename}
                </p>
                <p className="text-[7px] font-display tracking-wide" style={{ color: "hsl(220 10% 38%)" }}>
                  {getSeasonTooltip(season)}
                </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dot */}
      <div
        className="relative w-4 h-4 rounded-full flex items-center justify-center border cursor-default transition-all duration-200"
        style={{
          background: `hsl(220 15% 8% / ${hovered ? "0.9" : "0.55"})`,
          borderColor: hovered ? cfg.lockColor : "hsl(220 12% 20% / 0.45)",
          boxShadow: hovered ? `0 0 8px ${cfg.lockColor}` : "none",
          opacity: hovered ? 0.9 : 0.38,
        }}
      >
        <span className="text-[7px] leading-none" style={{ filter: "saturate(0.25) brightness(0.55)" }}>
          {FLAG_EMOJI[node.code] || "·"}
        </span>
      </div>

      {hovered && (
        <div
          className="absolute top-full left-1/2 mt-0.5 text-[6px] font-display tracking-wider whitespace-nowrap"
          style={{ transform: "translateX(-50%)", color: cfg.color, opacity: 0.8 }}
        >
          {cfg.label}
        </div>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const CinematicWorldMap = ({
  countries,
  draggingFragmentId,
  placedCountryIds,
  onDropOnCountry,
  onDropOnMap,
  onCountryClick,
  globalProgress = 0,
  collectedCountryCodes = [],
  forceFullReveal = false,
  snapTargetId = null,
}: CinematicWorldMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const playableNodes = countries.filter(c => c.visibility === "playable");
  const lockedNodes   = countries.filter(c => c.visibility !== "playable" && c.visibility !== "hidden");

  const freeCount   = playableNodes.filter(n => FREE_COUNTRY_CODES.has(n.code)).length;
  const lockedCount = lockedNodes.length;

  // Map brightness evolves with global progress (forceFullReveal overrides)
  const mapBrightness = forceFullReveal ? 1.0 :
    globalProgress >= 100 ? 1.0 :
    globalProgress >= 75  ? 0.88 :
    globalProgress >= 50  ? 0.78 :
    globalProgress >= 25  ? 0.65 :
    globalProgress >= 10  ? 0.55 : 0.42;

  const mapSaturate = forceFullReveal ? 1.8 : 0.7 + globalProgress * 0.003;

  // Connection intensity (more connections glow at higher %)
  const connectionOpacity = Math.min(0.88, 0.18 + globalProgress * 0.007);

  // Map-level drop: calculate drop position in % and delegate to parent
  const handleMapDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingFragmentId || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const dropX = ((e.clientX - rect.left) / rect.width) * 100;
    const dropY = ((e.clientY - rect.top) / rect.height) * 100;

    if (onDropOnMap) {
      onDropOnMap(dropX, dropY);
    }
  }, [draggingFragmentId, onDropOnMap]);

  return (
    <div
      ref={mapRef}
      className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{
        aspectRatio: "16 / 9",
        border: "1px solid hsl(40 80% 55% / 0.25)",
        boxShadow: "0 0 60px hsl(40 80% 55% / 0.08)",
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleMapDrop}
    >
      {/* Background — brightness + optional slow-zoom at 99% */}
      <motion.img
        src={carteWep}
        alt="Carte World Escape Protocol"
        className="absolute inset-0 w-full h-full object-cover"
        animate={{
          filter: `brightness(${mapBrightness}) saturate(${mapSaturate})`,
          scale: (!forceFullReveal && globalProgress >= 99 && globalProgress < 100) ? 1.04 : 1,
        }}
        transition={{ duration: forceFullReveal ? 3 : globalProgress >= 99 ? 8 : 1.2, ease: "easeOut" }}
        draggable={false}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 35%, hsl(220 25% 4% / 0.55) 100%)" }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(220 15% 4%) 2px, hsl(220 15% 4%) 4px)" }}
      />

      {/* ── Cinematic revelation overlay (all thresholds, SVG arcs, zones, labels, Jasper) ── */}
      <RevealOverlay globalProgress={globalProgress} />
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
          const x1 = from.x, y1 = from.y * 0.5625;
          const x2 = to.x,   y2 = to.y   * 0.5625;
          const qx = (x1 + x2) / 2;
          const qy = Math.min(y1, y2) - 5;
          const d  = `M ${x1} ${y1} Q ${qx} ${qy} ${x2} ${y2}`;
          const active = from.unlockedPieces > 0 && to.unlockedPieces > 0;
          return (
            <g key={idx}>
              <path d={d} fill="none" stroke={`hsl(40 50% 45% / ${connectionOpacity * 0.22})`} strokeWidth="0.22" strokeDasharray="0.9 0.9" />
              {active && (
                <>
                  <motion.path
                    d={d} fill="none" stroke="url(#goldLine)" strokeWidth="0.45"
                    strokeLinecap="round" filter="url(#lineGlow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2, delay: 0.35 * idx, ease: "easeInOut" }}
                  />
                  <motion.circle
                    r="0.55" fill="hsl(40 90% 82%)" filter="url(#lineGlow)"
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

      {/* ── Locked nodes (190 countries, dimmed) ── */}
      {lockedNodes.map(node => (
        <LockedNode key={node.id} node={node} />
      ))}

      {/* ── Playable nodes ── */}
      {playableNodes.map((node, i) => {
        const isFree       = FREE_COUNTRY_CODES.has(node.code);
        const isComplete   = node.unlockedPieces >= node.totalPieces;
        const hasAny       = node.unlockedPieces > 0;
        const wasPlaced    = placedCountryIds.includes(node.id);
        const hasFragment  = collectedCountryCodes.includes(node.code);
        const isDropTarget = draggingFragmentId !== null;
        const justSnapped  = snapTargetId === node.id;

        const borderColor = isComplete ? "hsl(40 85% 65%)" : hasFragment ? "hsl(40 70% 55%)" : isFree ? "hsl(40 70% 50%)" : "hsl(220 15% 28%)";
        const bgColor     = isComplete ? "hsl(40 50% 13%)" : hasFragment ? "hsl(40 40% 10%)" : isFree ? "hsl(220 22% 11%)" : "hsl(220 18% 9%)";
        const labelColor  = isComplete ? "hsl(40 85% 70%)" : hasFragment ? "hsl(40 75% 65%)" : isFree ? "hsl(40 65% 62%)" : "hsl(220 10% 50%)";

        return (
          <motion.div
            key={node.id}
            className="absolute z-20"
            style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%,-50%)" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 * i, type: "spring", stiffness: 260, damping: 22 }}
          >
            {isFree && (
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{ inset: "-14px", background: "radial-gradient(circle, hsl(40 80% 55% / 0.2) 0%, transparent 70%)" }}
                animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0.85, 0.4] }}
                transition={{ repeat: Infinity, duration: 3.2, delay: i * 0.55, ease: "easeInOut" }}
              />
            )}
            {/* Fragment collected glow ring */}
            {hasFragment && !wasPlaced && (
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{ inset: "-8px", border: "1px solid hsl(40 80% 55% / 0.7)" }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              />
            )}
            {isDropTarget && (
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{ inset: "-10px", border: "1.5px solid hsl(40 80% 55%)", background: "hsl(40 80% 55% / 0.07)" }}
                animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.85, 0.35] }}
                transition={{ repeat: Infinity, duration: 1.1 }}
              />
            )}
            {/* Snap glow burst */}
            <AnimatePresence>
              {justSnapped && (
                <motion.div
                  className="absolute rounded-full pointer-events-none"
                  style={{ inset: "-20px", background: "radial-gradient(circle, hsl(40 90% 65% / 0.6) 0%, hsl(40 80% 55% / 0.2) 40%, transparent 70%)" }}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [1, 1.8], opacity: [1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>
            <button
              className="relative flex flex-col items-center gap-1 group outline-none"
              onClick={() => onCountryClick(node)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onDropOnCountry(node.id); }}
            >
              {isFree && (
                <div
                  className="text-[7px] font-display tracking-widest px-1.5 py-[1px] rounded-full border whitespace-nowrap"
                  style={{
                    background: "hsl(40 80% 55% / 0.15)", borderColor: "hsl(40 80% 55% / 0.55)",
                    color: "hsl(40 85% 72%)", boxShadow: "0 0 6px hsl(40 80% 55% / 0.25)",
                  }}
                >
                  GRATUIT
                </div>
              )}
              <div
                className="relative w-9 h-9 rounded-full flex items-center justify-center border-2 transition-transform duration-150 group-hover:scale-110"
                style={{
                  background: bgColor, borderColor,
                  boxShadow: (isFree || isComplete || hasFragment) ? `0 0 12px ${borderColor}, 0 0 3px ${borderColor}` : "none",
                }}
              >
                {hasAny && !isComplete && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(40 85% 60%)" strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={`${(node.unlockedPieces / node.totalPieces) * 100.5} 100.5`}
                    />
                  </svg>
                )}
                <span className="text-base leading-none">{FLAG_EMOJI[node.code] || "🌍"}</span>
                {/* Fragment collected badge (🧩) — only if not yet placed */}
                {hasFragment && !wasPlaced && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px]"
                    style={{ background: "hsl(40 80% 45%)", border: "1px solid hsl(40 80% 65%)" }}
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                  >🧩</motion.div>
                )}
                {wasPlaced && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold"
                    style={{ background: "hsl(140 60% 40%)", border: "1px solid hsl(140 60% 60%)" }}
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                  >✓</motion.div>
                )}
              </div>
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
                    background: "hsl(220 20% 8% / 0.85)", border: "1px solid hsl(220 15% 16%)",
                    color: isComplete ? "hsl(40 80% 65%)" : "hsl(220 10% 48%)",
                  }}
                >
                  {node.unlockedPieces}/{node.totalPieces}
                </span>
              </div>
            </button>
          </motion.div>
        );
      })}

      {/* Omega */}
      <div
        className="absolute flex flex-col items-center gap-[3px] pointer-events-none z-10"
        style={{ left: "50%", top: "85%", transform: "translate(-50%,-50%)" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm border"
          style={{ background: "hsl(280 40% 6%)", borderColor: "hsl(280 50% 25%)", boxShadow: "0 0 10px hsl(280 50% 25% / 0.35)" }}
        >Ω</div>
        <span className="text-[7px] font-display tracking-widest" style={{ color: "hsl(280 40% 42%)" }}>OMÉGA</span>
      </div>

      {/* HUD top-left */}
      <div className="absolute top-3 left-3 pointer-events-none z-30">
        <div
          className="text-[10px] font-display tracking-widest px-2 py-[3px] rounded border backdrop-blur-sm"
          style={{ background: "hsl(220 25% 4% / 0.75)", borderColor: "hsl(40 80% 55% / 0.2)", color: "hsl(40 70% 60%)" }}
        >
          CARTE OPÉRATIONNELLE
        </div>
      </div>

      {/* HUD top-right */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none z-30">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[10px] font-display tracking-wider" style={{ color: "hsl(40 70% 60%)" }}>EN DIRECT</span>
      </div>

      {/* HUD bottom-left */}
      <div className="absolute bottom-3 left-3 pointer-events-none z-30 flex flex-col gap-1">
        <div
          className="flex items-center gap-1.5 text-[9px] font-display tracking-wider px-2 py-[3px] rounded border backdrop-blur-sm"
          style={{ background: "hsl(40 80% 55% / 0.08)", borderColor: "hsl(40 80% 55% / 0.22)", color: "hsl(40 80% 65%)" }}
        >
          <span>✦</span>
          <span>{freeCount} PAYS GRATUITS ACTIFS</span>
        </div>
        <div
          className="flex items-center gap-1.5 text-[9px] font-display tracking-wider px-2 py-[3px] rounded border backdrop-blur-sm"
          style={{ background: "hsl(220 18% 6% / 0.75)", borderColor: "hsl(220 15% 18% / 0.5)", color: "hsl(220 10% 45%)" }}
        >
          <span>🔒</span>
          <span>{lockedCount} PAYS VERROUILLÉS — SURVOLE POUR DÉCOUVRIR</span>
        </div>
      </div>

      {/* Operation legend bottom-right */}
      <div className="absolute bottom-3 right-3 pointer-events-none z-30 flex flex-col items-end gap-[3px]">
        {([1, 2, 3, 4] as const).map(s => {
          const cfg = SEASON_CONFIG[s];
          return (
            <div key={s} className="flex items-center gap-1.5 text-[7px] font-display tracking-wider opacity-65">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
              <span style={{ color: cfg.color }}>{cfg.codename} · {cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Drop hint */}
      <AnimatePresence>
        {draggingFragmentId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
             className="absolute bottom-14 right-3 text-[10px] font-display tracking-wider px-2.5 py-1.5 rounded border backdrop-blur-sm z-30"
            style={{ background: "hsl(40 80% 55% / 0.14)", borderColor: "hsl(40 80% 55% / 0.45)", color: "hsl(40 85% 70%)" }}
          >
            ↓ DÉPOSEZ PRÈS DU PAYS CIBLE
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CinematicWorldMap;
