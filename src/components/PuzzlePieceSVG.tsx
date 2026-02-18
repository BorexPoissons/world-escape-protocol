import { motion } from "framer-motion";

interface PuzzlePieceSVGProps {
  index: number;
  total: number;
  unlocked: boolean;
  isNew?: boolean;
  onClick?: () => void;
}

// Generate a puzzle piece SVG path with tabs/blanks on each side
const getPiecePath = (idx: number, total: number) => {
  // Simple unique path variation per index
  const tab = 0.3;
  const s = 1; // unit square
  const cx = s / 2;

  // Top side: tab or blank based on index parity
  const topTab = idx % 2 === 0;
  // Right side
  const rightTab = (idx + 1) % 3 === 0;
  // Bottom side
  const bottomTab = idx % 3 !== 0;
  // Left side
  const leftTab = (idx + 2) % 2 === 0;

  const t = tab;
  const r = (1 - t) / 2;

  // Build path (unit square with rounded tabs)
  // Top edge
  let d = `M 0 0 `;
  d += `L ${r} 0 `;
  if (topTab) {
    d += `Q ${r} ${-t} ${cx} ${-t} Q ${1 - r} ${-t} ${1 - r} 0 `;
  } else {
    d += `Q ${r} ${t} ${cx} ${t} Q ${1 - r} ${t} ${1 - r} 0 `;
  }
  d += `L 1 0 `;
  // Right edge
  d += `L 1 ${r} `;
  if (rightTab) {
    d += `Q ${1 + t} ${r} ${1 + t} ${cx} Q ${1 + t} ${1 - r} 1 ${1 - r} `;
  } else {
    d += `Q ${1 - t} ${r} ${1 - t} ${cx} Q ${1 - t} ${1 - r} 1 ${1 - r} `;
  }
  d += `L 1 1 `;
  // Bottom edge (reversed)
  d += `L ${1 - r} 1 `;
  if (bottomTab) {
    d += `Q ${1 - r} ${1 + t} ${cx} ${1 + t} Q ${r} ${1 + t} ${r} 1 `;
  } else {
    d += `Q ${1 - r} ${1 - t} ${cx} ${1 - t} Q ${r} ${1 - t} ${r} 1 `;
  }
  d += `L 0 1 `;
  // Left edge (reversed)
  d += `L 0 ${1 - r} `;
  if (leftTab) {
    d += `Q ${-t} ${1 - r} ${-t} ${cx} Q ${-t} ${r} 0 ${r} `;
  } else {
    d += `Q ${t} ${1 - r} ${t} ${cx} Q ${t} ${r} 0 ${r} `;
  }
  d += `Z`;
  return d;
};

const PuzzlePieceSVG = ({ index, unlocked, isNew = false, onClick }: PuzzlePieceSVGProps) => {
  const piecePath = getPiecePath(index, 5);
  const scale = 44; // px per unit
  const padding = 12; // extra space for tabs

  const viewBoxSize = 1 + 2 * (12 / scale);
  const vbOffset = -(12 / scale);

  return (
    <motion.div
      className={`cursor-pointer select-none ${onClick ? "hover:scale-105" : ""}`}
      onClick={onClick}
      initial={isNew ? { scale: 0, rotate: -10, opacity: 0 } : { scale: 1 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={
        isNew
          ? { type: "spring", stiffness: 300, damping: 18, delay: 0.1 * index }
          : { delay: 0.05 * index }
      }
      title={unlocked ? "Pièce débloquée — cliquez pour les détails" : "Pièce verrouillée"}
    >
      <svg
        width={scale + padding * 2}
        height={scale + padding * 2}
        viewBox={`${vbOffset} ${vbOffset} ${1 + 2 * (padding / scale)} ${1 + 2 * (padding / scale)}`}
        overflow="visible"
      >
        <defs>
          <filter id={`glow-piece-${index}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="0.04" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`gold-grad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(40 80% 65%)" />
            <stop offset="100%" stopColor="hsl(40 60% 40%)" />
          </linearGradient>
        </defs>

        {unlocked ? (
          <>
            {/* Glow effect */}
            <path
              d={piecePath}
              fill="hsl(40 80% 55% / 0.15)"
              stroke="hsl(40 80% 55%)"
              strokeWidth="0.04"
              filter={`url(#glow-piece-${index})`}
            />
            {/* Main piece */}
            <path
              d={piecePath}
              fill={`url(#gold-grad-${index})`}
              stroke="hsl(40 80% 70%)"
              strokeWidth="0.025"
              opacity="0.95"
            />
            {/* Inner shine */}
            <path
              d={piecePath}
              fill="none"
              stroke="hsl(40 90% 80% / 0.4)"
              strokeWidth="0.015"
              strokeDasharray="0.1 0.05"
            />
          </>
        ) : (
          <>
            {/* Locked piece */}
            <path
              d={piecePath}
              fill="hsl(220 15% 12%)"
              stroke="hsl(220 15% 22%)"
              strokeWidth="0.025"
              opacity="0.7"
            />
            {/* Lock pattern */}
            <path
              d={piecePath}
              fill="none"
              stroke="hsl(220 15% 28%)"
              strokeWidth="0.01"
              strokeDasharray="0.06 0.06"
            />
          </>
        )}
      </svg>
    </motion.div>
  );
};

export default PuzzlePieceSVG;
