import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Package } from "lucide-react";

export interface Fragment {
  id: string;
  countryId: string;
  countryCode: string;
  countryName: string;
  fragmentIndex: number;
  isPlaced: boolean;
}

interface FragmentInventoryProps {
  fragments: Fragment[];
  draggingId: string | null;
  onDragStart: (fragmentId: string) => void;
  onDragEnd: () => void;
}

// Unique 3D-style puzzle piece shapes per index
const PIECE_PATHS = [
  "M 4 4 L 16 4 Q 14 8 16 10 L 20 10 L 20 20 Q 16 18 14 20 L 4 20 Q 6 16 4 14 Z",
  "M 4 4 L 20 4 Q 18 8 20 10 L 20 20 L 12 20 Q 14 16 12 14 L 4 14 Q 6 10 4 8 Z",
  "M 4 4 Q 8 6 10 4 L 20 4 L 20 16 Q 16 14 14 16 L 4 16 Z",
  "M 6 4 Q 8 8 6 10 L 4 10 L 4 20 L 20 20 L 20 8 Q 16 10 14 8 L 14 4 Z",
  "M 4 4 L 14 4 Q 12 8 14 10 L 20 10 L 20 20 L 4 20 Q 6 16 4 14 Z",
];

const COUNTRY_COLORS: Record<string, string> = {
  CH: "hsl(40 80% 55%)",
  JP: "hsl(0 70% 55%)",
  EG: "hsl(45 90% 50%)",
  FR: "hsl(220 70% 55%)",
  DE: "hsl(50 80% 50%)",
  IT: "hsl(120 50% 45%)",
  ES: "hsl(25 80% 50%)",
  GB: "hsl(215 70% 50%)",
  BR: "hsl(130 60% 40%)",
  DEFAULT: "hsl(40 50% 45%)",
};

const FragmentPiece = ({
  fragment,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  fragment: Fragment;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) => {
  const color = COUNTRY_COLORS[fragment.countryCode] || COUNTRY_COLORS.DEFAULT;
  const path = PIECE_PATHS[fragment.fragmentIndex % PIECE_PATHS.length];

  return (
    <motion.div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="relative cursor-grab active:cursor-grabbing select-none"
      whileHover={{ scale: 1.15, y: -4 }}
      whileTap={{ scale: 0.95 }}
      animate={isDragging ? { opacity: 0.5, scale: 0.9 } : { opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      title={`Fragment ${fragment.fragmentIndex + 1} — ${fragment.countryName}`}
    >
      <div className="relative">
        {/* Glow backdrop */}
        <div
          className="absolute inset-0 rounded blur-md opacity-40"
          style={{ background: color }}
        />

        {/* SVG Piece */}
        <svg width="52" height="52" viewBox="0 0 24 24" className="relative z-10 drop-shadow-lg">
          <defs>
            <linearGradient id={`frag-grad-${fragment.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="60%" stopColor={color} stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(220 20% 8%)" stopOpacity="0.9" />
            </linearGradient>
            <filter id={`frag-glow-${fragment.id}`}>
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Shadow */}
          <path
            d={path}
            fill="hsl(220 20% 5%)"
            transform="translate(0.8 0.8)"
            opacity="0.6"
          />

          {/* Main piece */}
          <path
            d={path}
            fill={`url(#frag-grad-${fragment.id})`}
            stroke={color}
            strokeWidth="0.8"
            filter={`url(#frag-glow-${fragment.id})`}
          />

          {/* Shine */}
          <path
            d={path}
            fill="none"
            stroke="white"
            strokeWidth="0.4"
            opacity="0.25"
            strokeDasharray="2 3"
          />

          {/* Inner highlight */}
          <path
            d={path}
            fill="white"
            opacity="0.08"
            transform="translate(0.5 0.5) scale(0.7)"
            style={{ transformOrigin: "12px 12px" }}
          />
        </svg>

        {/* Fragment number */}
        <div
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-display font-bold z-20"
          style={{
            background: "hsl(220 20% 10%)",
            border: `1px solid ${color}`,
            color,
            fontSize: "8px",
          }}
        >
          {fragment.fragmentIndex + 1}
        </div>
      </div>

      {/* Country label */}
      <p className="text-center text-xs font-display mt-1 tracking-wider" style={{ color, fontSize: "9px" }}>
        {fragment.countryCode}
      </p>
    </motion.div>
  );
};

const FragmentInventory = ({
  fragments,
  draggingId,
  onDragStart,
  onDragEnd,
}: FragmentInventoryProps) => {
  const unplaced = fragments.filter(f => !f.isPlaced);
  const placed = fragments.filter(f => f.isPlaced);

  return (
    <div
      className="rounded-xl border border-border overflow-hidden"
      style={{
        background: "linear-gradient(180deg, hsl(220 20% 7%) 0%, hsl(220 18% 5%) 100%)",
        boxShadow: "0 -4px 40px hsl(40 80% 55% / 0.05), inset 0 1px 0 hsl(40 80% 55% / 0.1)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="font-display text-sm tracking-widest text-foreground">INVENTAIRE DES FRAGMENTS</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-display text-muted-foreground">
            <span className="text-primary">{unplaced.length}</span> disponibles · <span className="text-muted-foreground">{placed.length}</span> placés
          </span>
          {unplaced.length > 0 && (
            <div className="flex items-center gap-1 text-xs font-display text-primary/60 tracking-wider">
              <Sparkles className="h-3 w-3" />
              GLISSEZ SUR LA CARTE
            </div>
          )}
        </div>
      </div>

      {/* Fragment grid */}
      <div className="px-5 py-4">
        {unplaced.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-3xl mb-2 opacity-30">🧩</div>
            <p className="text-xs font-display text-muted-foreground tracking-wider">
              {placed.length > 0 ? "TOUS LES FRAGMENTS ONT ÉTÉ PLACÉS" : "AUCUN FRAGMENT — COMPLÉTEZ DES MISSIONS"}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 justify-center">
              <AnimatePresence>
                {unplaced.map((fragment, i) => (
                  <motion.div
                    key={fragment.id}
                    initial={{ opacity: 0, scale: 0, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0, y: -10 }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 300 }}
                  >
                    <FragmentPiece
                      fragment={fragment}
                      isDragging={draggingId === fragment.id}
                      onDragStart={() => onDragStart(fragment.id)}
                      onDragEnd={onDragEnd}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <p className="text-center text-xs text-muted-foreground/50 font-display tracking-wider mt-4">
              — FAITES GLISSER UN FRAGMENT VERS SON PAYS D'ORIGINE —
            </p>
          </>
        )}
      </div>

      {/* Placed fragments summary */}
      {placed.length > 0 && (
        <div className="border-t border-border/50 px-5 py-3">
          <p className="text-xs font-display text-muted-foreground tracking-wider mb-2">FRAGMENTS INTÉGRÉS</p>
          <div className="flex flex-wrap gap-1.5">
            {placed.map(f => (
              <div
                key={f.id}
                className="text-xs font-display px-2 py-0.5 rounded"
                style={{
                  background: "hsl(40 80% 55% / 0.1)",
                  border: "1px solid hsl(40 80% 55% / 0.3)",
                  color: "hsl(40 80% 65%)",
                }}
              >
                {f.countryCode}-{f.fragmentIndex + 1}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FragmentInventory;
