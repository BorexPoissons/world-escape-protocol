import { motion, AnimatePresence } from "framer-motion";
import carteWep from "@/assets/carte-wep.png";

export interface MapCountry {
  id: string;
  name: string;
  code: string;
  unlockedPieces: number;
  totalPieces: number;
  visibility: "playable" | "locked_upgrade" | "silhouette" | "hidden";
  x: number; // % position on map
  y: number;
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

// Geographic positions calibrated to match the WEP map image (% of container)
export const COUNTRY_GEO: Record<string, { x: number; y: number }> = {
  // ── SEASON 0 — 5 Free Countries ──
  CH: { x: 51.5, y: 32 },   // Switzerland — Central Europe
  BR: { x: 30, y: 63 },     // Brazil — South America
  CN: { x: 76, y: 36 },     // China — East Asia
  US: { x: 17, y: 34 },     // USA — North America
  IN: { x: 67, y: 46 },     // India — South Asia
  // ── SEASON 1 ──
  JP: { x: 82, y: 33 },
  EG: { x: 56, y: 46 },
  ES: { x: 46, y: 37 },
  GR: { x: 54, y: 38 },
  IT: { x: 52, y: 37 },
  FR: { x: 48, y: 32 },
  MA: { x: 46, y: 44 },
  RU: { x: 65, y: 22 },
  DE: { x: 51, y: 29 },
  // ── OTHERS ──
  GB: { x: 47, y: 27 },
  CA: { x: 16, y: 24 },
  AU: { x: 80, y: 68 },
  MX: { x: 15, y: 44 },
  ZA: { x: 55, y: 72 },
  TR: { x: 58, y: 36 },
  AR: { x: 28, y: 76 },
  KR: { x: 80, y: 35 },
  PT: { x: 44, y: 37 },
  NL: { x: 49, y: 28 },
  SE: { x: 52, y: 23 },
};

// Connection lines between the 5 free countries (narrative web)
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, countryId: string) => {
    e.preventDefault();
    onDropOnCountry(countryId);
  };

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{
        border: "1px solid hsl(40 80% 55% / 0.25)",
        boxShadow: "0 0 60px hsl(40 80% 55% / 0.08), inset 0 0 80px hsl(220 30% 3% / 0.5)",
        aspectRatio: "16/9",
      }}
    >
      {/* ── Real WEP Map Image as background ── */}
      <img
        src={carteWep}
        alt="Carte World Escape Protocol"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: "brightness(0.75) saturate(0.85)" }}
        draggable={false}
      />

      {/* Dark vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, transparent 40%, hsl(220 25% 4% / 0.6) 100%)",
        }}
      />

      {/* Scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(220 15% 5%) 2px, hsl(220 15% 5%) 4px)",
        }}
      />

      {/* SVG overlay — positioned absolutely on top of image */}
      <svg
        viewBox="0 0 100 56.25"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ pointerEvents: "none" }}
      >
        <defs>
          <filter id="mapGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="nodeGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="freeGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(40 80% 55%)" stopOpacity="0.05" />
            <stop offset="50%" stopColor="hsl(40 80% 65%)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(40 80% 55%)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="freeGoldLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(40 90% 65%)" stopOpacity="0.1" />
            <stop offset="50%" stopColor="hsl(40 90% 75%)" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(40 90% 65%)" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* ── Connection lines between free countries ── */}
        {FREE_CONNECTIONS.map(([fromCode, toCode], idx) => {
          const from = countries.find(c => c.code === fromCode);
          const to = countries.find(c => c.code === toCode);
          if (!from || !to) return null;

          const bothCompleted = from.unlockedPieces > 0 && to.unlockedPieces > 0;
          const mx = (from.x + to.x) / 2;
          const my = Math.min(from.y, to.y) - 7;
          const pathD = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;

          return (
            <g key={idx}>
              {/* Dim baseline — always visible */}
              <path
                d={pathD}
                fill="none"
                stroke="hsl(40 40% 40% / 0.25)"
                strokeWidth="0.3"
                strokeDasharray="1.2 1.2"
              />
              {bothCompleted && (
                <>
                  <motion.path
                    d={pathD}
                    fill="none"
                    stroke="url(#freeGoldLine)"
                    strokeWidth="0.55"
                    filter="url(#mapGlow)"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2, delay: 0.4 * idx, ease: "easeInOut" }}
                  />
                  {/* Traveling dot */}
                  <motion.circle
                    r="0.7"
                    fill="hsl(40 90% 80%)"
                    filter="url(#mapGlow)"
                    animate={{ offsetDistance: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
                    style={{ offsetPath: `path("${pathD}")` } as any}
                    transition={{ duration: 3.5, repeat: Infinity, delay: idx * 1.1, ease: "linear" }}
                  />
                </>
              )}
            </g>
          );
        })}

        {/* ── Silhouette nodes (season 1+ locked) ── */}
        {silhouetteNodes.map((node) => (
          <g key={node.id} opacity="0.2">
            <circle
              cx={node.x} cy={node.y} r="3"
              fill="hsl(220 15% 10%)"
              stroke="hsl(220 15% 20%)"
              strokeWidth="0.4"
              strokeDasharray="0.6 0.6"
            />
            <text x={node.x} y={node.y + 1} textAnchor="middle" fontSize="2.5" dominantBaseline="middle" fill="hsl(220 10% 30%)">?</text>
          </g>
        ))}

        {/* ── Locked upgrade nodes (next season CTA) ── */}
        {lockedNodes.map((node) => (
          <g key={node.id} opacity="0.6">
            <circle
              cx={node.x} cy={node.y} r="3.5"
              fill="hsl(40 20% 8%)"
              stroke="hsl(40 50% 30%)"
              strokeWidth="0.5"
              strokeDasharray="0.8 0.4"
            />
            <text x={node.x} y={node.y + 1.2} textAnchor="middle" fontSize="3" dominantBaseline="middle">🔒</text>
            <text
              x={node.x} y={node.y + 7}
              textAnchor="middle" fontSize="1.8"
              fontFamily="monospace" fill="hsl(40 50% 40%)" letterSpacing="0.1"
            >
              SAISON 1
            </text>
          </g>
        ))}

        {/* ── Playable country nodes ── */}
        {playableNodes.map((node, i) => {
          const isFree = FREE_COUNTRY_CODES.has(node.code);
          const isComplete = node.unlockedPieces >= node.totalPieces;
          const hasAny = node.unlockedPieces > 0;
          const isDropTarget = draggingFragmentId !== null;
          const wasPlaced = placedCountryIds.includes(node.id);

          const nodeColor = isComplete
            ? "hsl(40 70% 18%)"
            : isFree
            ? "hsl(220 22% 12%)"
            : "hsl(220 18% 10%)";
          const strokeColor = isComplete
            ? "hsl(40 85% 65%)"
            : isFree
            ? "hsl(40 70% 50%)"
            : "hsl(220 15% 22%)";

          return (
            <motion.g
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 * i, type: "spring", stiffness: 220, damping: 20 }}
              style={{
                transformOrigin: `${node.x}px ${node.y}px`,
                cursor: "pointer",
                pointerEvents: "all",
              }}
              onClick={() => onCountryClick(node)}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => handleDrop(e as any, node.id)}
            >
              {/* Free country ambient halo */}
              {isFree && (
                <motion.circle
                  cx={node.x} cy={node.y} r="6"
                  fill="hsl(40 80% 55% / 0.08)"
                  stroke="none"
                  animate={{ r: [5.5, 7, 5.5], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 3, delay: i * 0.5, ease: "easeInOut" }}
                />
              )}

              {/* Drop zone ring when dragging */}
              {isDropTarget && (
                <motion.circle
                  cx={node.x} cy={node.y} r="6.5"
                  fill="hsl(40 80% 55% / 0.12)"
                  stroke="hsl(40 80% 55%)"
                  strokeWidth="0.5"
                  strokeDasharray="1 0.5"
                  animate={{ r: [6, 7, 6], opacity: [0.4, 0.9, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                />
              )}

              {/* Outer glow ring — active countries */}
              {(hasAny || isComplete) && (
                <motion.circle
                  cx={node.x} cy={node.y} r="5"
                  fill="none"
                  stroke={isComplete ? "hsl(40 85% 70%)" : "hsl(40 80% 60%)"}
                  strokeWidth="0.35"
                  filter="url(#nodeGlow)"
                  animate={{ opacity: [0.3, 0.85, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.4 }}
                />
              )}

              {/* Free badge outer ring — permanent glow for free countries */}
              {isFree && !hasAny && (
                <motion.circle
                  cx={node.x} cy={node.y} r="4.5"
                  fill="none"
                  stroke="hsl(40 70% 50%)"
                  strokeWidth="0.25"
                  filter="url(#freeGlow)"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ repeat: Infinity, duration: 3, delay: i * 0.6 }}
                />
              )}

              {/* Main node circle */}
              <circle
                cx={node.x} cy={node.y} r="3.8"
                fill={nodeColor}
                stroke={strokeColor}
                strokeWidth={isFree ? "0.55" : "0.4"}
              />

              {/* Progress arc */}
              {hasAny && !isComplete && (
                <motion.circle
                  cx={node.x} cy={node.y} r="3.8"
                  fill="none"
                  stroke="hsl(40 85% 60%)"
                  strokeWidth="0.65"
                  strokeLinecap="round"
                  strokeDasharray={`${(node.unlockedPieces / node.totalPieces) * 23.9} 23.9`}
                  transform={`rotate(-90 ${node.x} ${node.y})`}
                  initial={{ strokeDasharray: "0 23.9" }}
                  animate={{ strokeDasharray: `${(node.unlockedPieces / node.totalPieces) * 23.9} 23.9` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              )}

              {/* Flag emoji */}
              <text
                x={node.x} y={node.y + 1.1}
                textAnchor="middle" fontSize="3.2" dominantBaseline="middle"
              >
                {FLAG_EMOJI[node.code] || "🌍"}
              </text>

              {/* Country label */}
              <text
                x={node.x} y={node.y + 8}
                textAnchor="middle" fontSize="2.1"
                fontFamily="'JetBrains Mono', monospace"
                letterSpacing="0.15"
                fill={isComplete ? "hsl(40 85% 70%)" : isFree ? "hsl(40 65% 60%)" : "hsl(220 10% 50%)"}
              >
                {node.name.length > 9 ? node.name.substring(0, 8).toUpperCase() + "." : node.name.toUpperCase()}
              </text>

              {/* GRATUIT badge — free countries only */}
              {isFree && (
                <>
                  <rect
                    x={node.x - 5} y={node.y - 9.5}
                    width="10" height="2.8" rx="1.4"
                    fill="hsl(40 80% 55% / 0.2)"
                    stroke="hsl(40 80% 55%)"
                    strokeWidth="0.25"
                  />
                  <text
                    x={node.x} y={node.y - 8.2}
                    textAnchor="middle" fontSize="1.9"
                    fontFamily="'JetBrains Mono', monospace"
                    letterSpacing="0.1"
                    fill="hsl(40 85% 70%)"
                    dominantBaseline="middle"
                  >
                    GRATUIT
                  </text>
                </>
              )}

              {/* Piece count badge */}
              <rect
                x={node.x + 2.2} y={node.y - 6.2}
                width="5.8" height="2.8" rx="1.4"
                fill={isComplete ? "hsl(40 80% 25%)" : "hsl(220 18% 12%)"}
                stroke={isComplete ? "hsl(40 80% 55%)" : "hsl(220 15% 25%)"}
                strokeWidth="0.25"
              />
              <text
                x={node.x + 5.1} y={node.y - 4.9}
                textAnchor="middle" fontSize="1.9"
                fontFamily="monospace"
                fill={isComplete ? "hsl(40 80% 70%)" : "hsl(220 10% 55%)"}
                dominantBaseline="middle"
              >
                {node.unlockedPieces}/{node.totalPieces}
              </text>

              {/* Completed dot */}
              {wasPlaced && (
                <motion.circle
                  cx={node.x - 3.2} cy={node.y - 3}
                  r="1.4"
                  fill="hsl(140 60% 50%)"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                />
              )}
            </motion.g>
          );
        })}

        {/* ── Omega Fragment — Director-only zone ── */}
        <g opacity="0.65">
          <circle cx="50" cy="50" r="4.5" fill="hsl(280 40% 7%)" stroke="hsl(280 60% 28%)" strokeWidth="0.45" strokeDasharray="0.8 0.5" />
          <text x="50" y="51.2" textAnchor="middle" fontSize="3.5" dominantBaseline="middle">Ω</text>
          <text x="50" y="57" textAnchor="middle" fontSize="1.9" fontFamily="monospace" fill="hsl(280 40% 45%)" letterSpacing="0.15">
            FRAGMENT OMÉGA
          </text>
        </g>
      </svg>

      {/* ── HUD overlays ── */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <div className="text-xs font-display tracking-widest text-primary/70 bg-background/60 backdrop-blur-sm px-2.5 py-1 rounded border border-primary/20">
          CARTE OPÉRATIONNELLE
        </div>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-1.5 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-xs font-display text-primary/70 tracking-wider">EN DIRECT</span>
      </div>

      {/* Free countries legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none">
        <div
          className="flex items-center gap-1.5 text-xs font-display tracking-wider px-2.5 py-1 rounded border backdrop-blur-sm"
          style={{ background: "hsl(40 80% 55% / 0.1)", borderColor: "hsl(40 80% 55% / 0.3)", color: "hsl(40 80% 65%)" }}
        >
          <span>✦</span>
          <span>5 PAYS GRATUITS ACTIFS</span>
        </div>
      </div>

      {/* Drop instruction when dragging */}
      <AnimatePresence>
        {draggingFragmentId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-3 right-3 text-xs font-display tracking-wider px-3 py-1.5 rounded border backdrop-blur-sm"
            style={{ background: "hsl(40 80% 55% / 0.15)", borderColor: "hsl(40 80% 55% / 0.5)", color: "hsl(40 85% 70%)" }}
          >
            ↓ DÉPOSEZ SUR UN PAYS
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CinematicWorldMap;
