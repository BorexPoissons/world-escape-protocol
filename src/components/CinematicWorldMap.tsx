import { motion, AnimatePresence } from "framer-motion";
import { Lock, HelpCircle } from "lucide-react";

export interface MapCountry {
  id: string;
  name: string;
  code: string;
  unlockedPieces: number;
  totalPieces: number;
  visibility: "playable" | "locked_upgrade" | "silhouette" | "hidden";
  x: number; // % position on map
  y: number;
}

interface CinematicWorldMapProps {
  countries: MapCountry[];
  draggingFragmentId: string | null;
  placedCountryIds: string[];
  onDropOnCountry: (countryId: string) => void;
  onCountryClick: (country: MapCountry) => void;
}

// Geographic positions (approximate % on a world map)
export const COUNTRY_GEO: Record<string, { x: number; y: number }> = {
  CH: { x: 50, y: 35 },
  JP: { x: 82, y: 33 },
  EG: { x: 55, y: 45 },
  FR: { x: 48, y: 33 },
  DE: { x: 51, y: 30 },
  IT: { x: 52, y: 37 },
  ES: { x: 46, y: 36 },
  GB: { x: 47, y: 27 },
  BR: { x: 30, y: 62 },
  US: { x: 18, y: 35 },
  CA: { x: 16, y: 25 },
  AU: { x: 80, y: 68 },
  CN: { x: 74, y: 35 },
  IN: { x: 67, y: 45 },
  MX: { x: 15, y: 44 },
  RU: { x: 65, y: 22 },
  ZA: { x: 55, y: 72 },
  MA: { x: 47, y: 43 },
  TR: { x: 57, y: 36 },
  AR: { x: 28, y: 75 },
  KR: { x: 80, y: 35 },
  GR: { x: 54, y: 38 },
};

// Connection lines between countries (narrative paths)
const CONNECTIONS = [
  ["CH", "EG"],
  ["CH", "JP"],
  ["EG", "JP"],
];

const FLAG_EMOJI: Record<string, string> = {
  CH: "🇨🇭", JP: "🇯🇵", EG: "🇪🇬", FR: "🇫🇷", DE: "🇩🇪",
  IT: "🇮🇹", ES: "🇪🇸", GB: "🇬🇧", BR: "🇧🇷", US: "🇺🇸",
  CA: "🇨🇦", AU: "🇦🇺", CN: "🇨🇳", IN: "🇮🇳", MX: "🇲🇽",
  RU: "🇷🇺", ZA: "🇿🇦", MA: "🇲🇦", TR: "🇹🇷", AR: "🇦🇷",
  KR: "🇰🇷", GR: "🇬🇷",
};

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
        background: "radial-gradient(ellipse at 50% 40%, hsl(220 25% 8%) 0%, hsl(220 20% 4%) 70%, hsl(220 20% 2%) 100%)",
        border: "1px solid hsl(40 80% 55% / 0.15)",
        boxShadow: "0 0 60px hsl(40 80% 55% / 0.05), inset 0 0 80px hsl(220 30% 3% / 0.5)",
      }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(hsl(40 80% 55% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(40 80% 55% / 0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(220 15% 5%) 2px, hsl(220 15% 5%) 4px)",
        }}
      />

      {/* SVG World Map Layer */}
      <svg
        viewBox="0 0 100 60"
        className="w-full h-auto"
        style={{ minHeight: 320 }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="mapGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nodeGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="silhouetteFilter">
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
          </filter>
          <radialGradient id="centerGlow" cx="50%" cy="45%" r="40%">
            <stop offset="0%" stopColor="hsl(40 80% 55%)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(40 80% 55%)" stopOpacity="0.1" />
            <stop offset="50%" stopColor="hsl(40 80% 55%)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(40 80% 55%)" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="redLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(0 80% 55%)" stopOpacity="0.1" />
            <stop offset="50%" stopColor="hsl(0 80% 55%)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="hsl(0 80% 55%)" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Background ambient glow */}
        <rect x="0" y="0" width="100" height="60" fill="url(#centerGlow)" />

        {/* World continents — simplified SVG shapes */}
        {/* North America */}
        <path
          d="M 5 20 L 25 18 L 28 25 L 22 35 L 18 42 L 12 45 L 8 38 L 5 28 Z"
          fill="hsl(220 20% 10%)"
          stroke="hsl(220 15% 18%)"
          strokeWidth="0.3"
          opacity="0.8"
        />
        {/* South America */}
        <path
          d="M 22 46 L 32 44 L 35 52 L 32 62 L 26 65 L 22 58 L 20 52 Z"
          fill="hsl(220 20% 9%)"
          stroke="hsl(220 15% 17%)"
          strokeWidth="0.3"
          opacity="0.8"
        />
        {/* Europe */}
        <path
          d="M 44 22 L 56 20 L 58 28 L 54 34 L 48 36 L 44 30 Z"
          fill="hsl(220 20% 11%)"
          stroke="hsl(220 15% 19%)"
          strokeWidth="0.3"
          opacity="0.8"
        />
        {/* Africa */}
        <path
          d="M 46 36 L 58 34 L 62 42 L 60 56 L 54 62 L 48 58 L 44 48 Z"
          fill="hsl(220 20% 10%)"
          stroke="hsl(220 15% 18%)"
          strokeWidth="0.3"
          opacity="0.8"
        />
        {/* Asia */}
        <path
          d="M 58 16 L 86 14 L 90 24 L 86 34 L 78 38 L 64 38 L 58 30 Z"
          fill="hsl(220 20% 10%)"
          stroke="hsl(220 15% 18%)"
          strokeWidth="0.3"
          opacity="0.8"
        />
        {/* Australia */}
        <path
          d="M 74 55 L 88 53 L 90 62 L 86 68 L 76 68 L 72 62 Z"
          fill="hsl(220 20% 9%)"
          stroke="hsl(220 15% 17%)"
          strokeWidth="0.3"
          opacity="0.8"
        />

        {/* Connection lines between active countries */}
        {CONNECTIONS.map(([fromCode, toCode], idx) => {
          const from = countries.find(c => c.code === fromCode);
          const to = countries.find(c => c.code === toCode);
          if (!from || !to) return null;
          const active = from.unlockedPieces > 0 && to.unlockedPieces > 0;
          const mx = (from.x + to.x) / 2;
          const my = Math.min(from.y, to.y) - 8;
          const pathD = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;

          return (
            <g key={idx}>
              {/* Dim baseline */}
              <path
                d={pathD}
                fill="none"
                stroke="hsl(220 15% 20%)"
                strokeWidth="0.4"
                strokeDasharray="1.5 1.5"
              />
              {active && (
                <>
                  <motion.path
                    d={pathD}
                    fill="none"
                    stroke="url(#goldLine)"
                    strokeWidth="0.5"
                    filter="url(#mapGlow)"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2, delay: 0.5 * idx, ease: "easeInOut" }}
                  />
                  {/* Animated traveling dot */}
                  <motion.circle
                    r="0.6"
                    fill="hsl(40 80% 70%)"
                    filter="url(#mapGlow)"
                    animate={{
                      offsetDistance: ["0%", "100%"],
                      opacity: [0, 1, 1, 0],
                    }}
                    style={{ offsetPath: `path("${pathD}")` } as any}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: idx * 1.2,
                      ease: "linear",
                    }}
                  />
                </>
              )}
            </g>
          );
        })}

        {/* Silhouette / mysterious nodes */}
        {silhouetteNodes.map((node) => (
          <g key={node.id} opacity="0.25">
            <circle
              cx={node.x}
              cy={node.y}
              r="3.5"
              fill="hsl(220 15% 15%)"
              stroke="hsl(220 15% 25%)"
              strokeWidth="0.4"
              strokeDasharray="0.8 0.8"
            />
            <text
              x={node.x}
              y={node.y + 1}
              textAnchor="middle"
              fontSize="3"
              dominantBaseline="middle"
              fill="hsl(220 10% 35%)"
            >
              ?
            </text>
          </g>
        ))}

        {/* Locked upgrade nodes */}
        {lockedNodes.map((node) => (
          <g key={node.id} opacity="0.5">
            <circle
              cx={node.x}
              cy={node.y}
              r="3.8"
              fill="hsl(40 30% 10%)"
              stroke="hsl(40 60% 35%)"
              strokeWidth="0.5"
              strokeDasharray="1 0.5"
            />
            <text
              x={node.x}
              y={node.y + 1.2}
              textAnchor="middle"
              fontSize="3.5"
              dominantBaseline="middle"
            >
              🔒
            </text>
            <text
              x={node.x}
              y={node.y + 7.5}
              textAnchor="middle"
              fontSize="2.2"
              fontFamily="monospace"
              fill="hsl(40 60% 40%)"
              letterSpacing="0.1"
            >
              CLASSIFIÉ
            </text>
          </g>
        ))}

        {/* Playable country nodes */}
        {playableNodes.map((node, i) => {
          const isComplete = node.unlockedPieces >= node.totalPieces;
          const hasAny = node.unlockedPieces > 0;
          const isDropTarget = draggingFragmentId !== null && hasAny;
          const wasPlaced = placedCountryIds.includes(node.id);

          return (
            <motion.g
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 * i, type: "spring", stiffness: 200, damping: 18 }}
              style={{ transformOrigin: `${node.x}px ${node.y}px`, cursor: "pointer" }}
              onClick={() => onCountryClick(node)}
            >
              {/* Drop zone highlight when dragging */}
              {isDropTarget && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r="7"
                  fill="hsl(40 80% 55% / 0.15)"
                  stroke="hsl(40 80% 55%)"
                  strokeWidth="0.6"
                  strokeDasharray="1 0.5"
                  animate={{ r: [6, 7.5, 6], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}

              {/* Outer glow ring */}
              {(hasAny || isComplete) && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r="5.5"
                  fill="none"
                  stroke={isComplete ? "hsl(40 80% 65%)" : "hsl(40 80% 55%)"}
                  strokeWidth="0.3"
                  filter="url(#nodeGlow)"
                  animate={{ opacity: [0.4, 0.9, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.3 }}
                />
              )}

              {/* Main node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r="4"
                fill={isComplete ? "hsl(40 70% 20%)" : hasAny ? "hsl(220 20% 12%)" : "hsl(220 18% 10%)"}
                stroke={isComplete ? "hsl(40 80% 65%)" : hasAny ? "hsl(40 60% 45%)" : "hsl(220 15% 22%)"}
                strokeWidth="0.5"
              />

              {/* Piece progress arc */}
              {hasAny && !isComplete && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r="4"
                  fill="none"
                  stroke="hsl(40 80% 55%)"
                  strokeWidth="0.6"
                  strokeLinecap="round"
                  strokeDasharray={`${(node.unlockedPieces / node.totalPieces) * 25.1} 25.1`}
                  transform={`rotate(-90 ${node.x} ${node.y})`}
                  initial={{ strokeDasharray: "0 25.1" }}
                  animate={{ strokeDasharray: `${(node.unlockedPieces / node.totalPieces) * 25.1} 25.1` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              )}

              {/* Flag emoji */}
              <text
                x={node.x}
                y={node.y + 1.2}
                textAnchor="middle"
                fontSize="3.5"
                dominantBaseline="middle"
              >
                {FLAG_EMOJI[node.code] || "🌍"}
              </text>

              {/* Country name */}
              <text
                x={node.x}
                y={node.y + 8.5}
                textAnchor="middle"
                fontSize="2.3"
                fontFamily="'JetBrains Mono', monospace"
                letterSpacing="0.2"
                fill={isComplete ? "hsl(40 80% 65%)" : hasAny ? "hsl(40 60% 55%)" : "hsl(220 10% 45%)"}
              >
                {node.name.length > 8 ? node.name.substring(0, 7).toUpperCase() + "." : node.name.toUpperCase()}
              </text>

              {/* Piece count badge */}
              <rect
                x={node.x + 2.5}
                y={node.y - 6}
                width="5.5"
                height="2.8"
                rx="1.4"
                fill={isComplete ? "hsl(40 80% 35%)" : "hsl(220 18% 15%)"}
                stroke={isComplete ? "hsl(40 80% 55%)" : "hsl(220 15% 25%)"}
                strokeWidth="0.3"
              />
              <text
                x={node.x + 5.3}
                y={node.y - 4.8}
                textAnchor="middle"
                fontSize="2"
                fontFamily="monospace"
                fill={isComplete ? "hsl(40 80% 70%)" : "hsl(220 10% 55%)"}
                dominantBaseline="middle"
              >
                {node.unlockedPieces}/{node.totalPieces}
              </text>

              {/* Placed marker */}
              {wasPlaced && (
                <motion.circle
                  cx={node.x - 3}
                  cy={node.y - 3}
                  r="1.5"
                  fill="hsl(120 60% 50%)"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                />
              )}
            </motion.g>
          );
        })}

        {/* Omega Fragment — center locked zone for Director */}
        <g opacity="0.7">
          <circle cx="50" cy="48" r="5" fill="hsl(280 40% 8%)" stroke="hsl(280 60% 30%)" strokeWidth="0.4" strokeDasharray="1 0.5" />
          <text x="50" y="49.2" textAnchor="middle" fontSize="3.5" dominantBaseline="middle">Ω</text>
          <text x="50" y="55" textAnchor="middle" fontSize="2" fontFamily="monospace" fill="hsl(280 40% 45%)" letterSpacing="0.1">
            OMEGA
          </text>
        </g>

        {/* Fog of war zones */}
        <ellipse cx="90" cy="18" rx="12" ry="8" fill="hsl(220 30% 5% / 0.7)" />
        <ellipse cx="10" cy="55" rx="8" ry="6" fill="hsl(220 30% 5% / 0.6)" />
      </svg>

      {/* Overlay labels */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className="text-xs font-display tracking-widest text-primary/60 bg-background/50 px-2 py-1 rounded border border-primary/20">
          CARTE OPÉRATIONNELLE
        </div>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs font-display text-primary/60 tracking-wider">EN DIRECT</span>
      </div>

      {/* Drop zone instruction when dragging */}
      <AnimatePresence>
        {draggingFragmentId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/90 border border-primary/40 rounded-lg px-4 py-2 text-xs font-display tracking-wider text-primary text-center backdrop-blur-sm"
          >
            ↑ DÉPOSEZ LE FRAGMENT SUR UN PAYS ACTIF
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CinematicWorldMap;
