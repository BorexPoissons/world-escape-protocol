import { motion } from "framer-motion";
import { CheckCircle, Lock } from "lucide-react";

interface CountryNode {
  id: string;
  name: string;
  code: string;
  flagEmoji: string;
  unlocked: boolean;
  x: number;
  y: number;
}

const FLAG_EMOJI: Record<string, string> = {
  CH: "🇨🇭",
  JP: "🇯🇵",
  EG: "🇪🇬",
};

// Fixed positions for each country on the map (percentage-based)
const COUNTRY_POSITIONS: Record<string, { x: number; y: number }> = {
  CH: { x: 20, y: 40 },
  JP: { x: 80, y: 35 },
  EG: { x: 50, y: 70 },
};

const DEFAULT_POS = { x: 50, y: 50 };

interface WorldPathMapProps {
  countries: {
    id: string;
    name: string;
    code: string;
    unlocked: boolean;
  }[];
}

const WorldPathMap = ({ countries }: WorldPathMapProps) => {
  const nodes: CountryNode[] = countries.map((c) => {
    const pos = COUNTRY_POSITIONS[c.code] || DEFAULT_POS;
    return {
      ...c,
      flagEmoji: FLAG_EMOJI[c.code] || "🏳️",
      x: pos.x,
      y: pos.y,
    };
  });

  // Build path segments between consecutive countries
  const segments = nodes.slice(0, -1).map((from, i) => ({
    from,
    to: nodes[i + 1],
    active: from.unlocked,
  }));

  const svgW = 100;
  const svgH = 100;

  return (
    <div className="relative w-full max-w-3xl mx-auto mb-12">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-auto"
        style={{ minHeight: 180 }}
      >
        <defs>
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Animated dash for active paths */}
          <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(40 80% 55%)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(40 80% 55%)" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Path segments */}
        {segments.map((seg, i) => {
          const pathD = `M ${seg.from.x} ${seg.from.y} Q ${(seg.from.x + seg.to.x) / 2} ${Math.min(seg.from.y, seg.to.y) - 12} ${seg.to.x} ${seg.to.y}`;
          return (
            <g key={i}>
              {/* Background line (always visible, dimmed) */}
              <path
                d={pathD}
                fill="none"
                stroke="hsl(220 15% 18%)"
                strokeWidth="0.6"
                strokeDasharray="2 2"
              />
              {/* Active glowing line */}
              {seg.active && (
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke="url(#pathGrad)"
                  strokeWidth="0.8"
                  filter="url(#glow)"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.5, delay: 0.3 * i, ease: "easeInOut" }}
                />
              )}
            </g>
          );
        })}

        {/* Country nodes */}
        {nodes.map((node, i) => (
          <motion.g
            key={node.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 * i, type: "spring", stiffness: 200 }}
            style={{ transformOrigin: `${node.x}px ${node.y}px` }}
          >
            {/* Outer glow ring for unlocked */}
            {node.unlocked && (
              <circle
                cx={node.x}
                cy={node.y}
                r="5.5"
                fill="none"
                stroke="hsl(40 80% 55%)"
                strokeWidth="0.3"
                opacity="0.4"
                filter="url(#glow)"
              />
            )}
            {/* Node circle */}
            <circle
              cx={node.x}
              cy={node.y}
              r="4"
              fill={node.unlocked ? "hsl(40 80% 55%)" : "hsl(220 15% 15%)"}
              stroke={node.unlocked ? "hsl(40 80% 65%)" : "hsl(220 15% 25%)"}
              strokeWidth="0.5"
            />
            {/* Flag emoji */}
            <text
              x={node.x}
              y={node.y + 1.2}
              textAnchor="middle"
              fontSize="4"
              dominantBaseline="middle"
            >
              {node.flagEmoji}
            </text>
            {/* Country name label */}
            <text
              x={node.x}
              y={node.y + 9}
              textAnchor="middle"
              fontSize="2.8"
              fontFamily="'JetBrains Mono', monospace"
              letterSpacing="0.15"
              fill={node.unlocked ? "hsl(40 80% 55%)" : "hsl(220 10% 50%)"}
            >
              {node.name.toUpperCase()}
            </text>
            {/* Status icon */}
            {node.unlocked ? (
              <circle cx={node.x + 4} cy={node.y - 3} r="1.5" fill="hsl(40 80% 55%)" />
            ) : (
              <circle cx={node.x + 4} cy={node.y - 3} r="1.5" fill="hsl(220 15% 25%)" />
            )}
          </motion.g>
        ))}
      </svg>
    </div>
  );
};

export default WorldPathMap;
