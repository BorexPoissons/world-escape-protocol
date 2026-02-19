import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Package, X, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

// ─── Constants ─────────────────────────────────────────────────────────────────

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
  CN: "hsl(0 75% 50%)",
  IN: "hsl(30 85% 55%)",
  RU: "hsl(220 60% 55%)",
  MA: "hsl(155 55% 40%)",
  GR: "hsl(200 70% 50%)",
  DEFAULT: "hsl(40 50% 45%)",
};

const FLAG_EMOJIS: Record<string, string> = {
  CH: "🇨🇭", JP: "🇯🇵", EG: "🇪🇬", FR: "🇫🇷", US: "🇺🇸",
  DE: "🇩🇪", IT: "🇮🇹", ES: "🇪🇸", GB: "🇬🇧", BR: "🇧🇷",
  CN: "🇨🇳", IN: "🇮🇳", RU: "🇷🇺", MA: "🇲🇦", GR: "🇬🇷",
};

// ─── Fragment Piece 3D SVG ─────────────────────────────────────────────────────

const FragmentPiece3D = ({
  fragment,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
  size = 56,
}: {
  fragment: Fragment;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
  size?: number;
}) => {
  const color = COUNTRY_COLORS[fragment.countryCode] || COUNTRY_COLORS.DEFAULT;
  const path = PIECE_PATHS[fragment.fragmentIndex % PIECE_PATHS.length];
  const gradId = `frag-grad-${fragment.id}`;
  const glowId = `frag-glow-${fragment.id}`;
  const shineId = `frag-shine-${fragment.id}`;

  return (
    <motion.div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="relative cursor-pointer select-none"
      whileHover={{ scale: 1.18, y: -6 }}
      whileTap={{ scale: 0.93 }}
      animate={isDragging ? { opacity: 0.4, scale: 0.85 } : { opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 22 }}
      title={`${fragment.countryName} — cliquez pour détails`}
      style={{ perspective: "400px" }}
    >
      <div
        className="relative"
        style={{ transform: "rotateX(12deg) rotateY(-8deg)", transformStyle: "preserve-3d" }}
      >
        {/* Animated pulse halo */}
        <motion.div
          className="absolute inset-0 rounded-lg blur-md"
          style={{ background: color, opacity: 0.25 }}
          animate={{ opacity: [0.2, 0.45, 0.2], scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
        />

        {/* SVG Piece */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          className="relative z-10"
          style={{ filter: `drop-shadow(0 6px 12px ${color}55) drop-shadow(0 2px 4px rgba(0,0,0,0.6))` }}
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="110%">
              <stop offset="0%" stopColor="white" stopOpacity="0.25" />
              <stop offset="30%" stopColor={color} stopOpacity="1" />
              <stop offset="80%" stopColor={color} stopOpacity="0.85" />
              <stop offset="100%" stopColor="hsl(220 25% 6%)" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id={shineId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.5" />
              <stop offset="40%" stopColor="white" stopOpacity="0.1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Deep shadow */}
          <path d={path} fill="hsl(220 30% 3%)" transform="translate(1.2 1.5)" opacity="0.7" />
          {/* Mid shadow */}
          <path d={path} fill="hsl(220 25% 8%)" transform="translate(0.6 0.8)" opacity="0.5" />

          {/* Main piece */}
          <path
            d={path}
            fill={`url(#${gradId})`}
            stroke={color}
            strokeWidth="0.7"
            filter={`url(#${glowId})`}
          />

          {/* Top edge highlight (simulates top-lit 3D) */}
          <path
            d={path}
            fill={`url(#${shineId})`}
            opacity="0.6"
          />

          {/* Fine edge line */}
          <path
            d={path}
            fill="none"
            stroke="white"
            strokeWidth="0.35"
            opacity="0.2"
            strokeDasharray="1.5 2.5"
          />
        </svg>

        {/* Fragment index badge */}
        <div
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center z-20"
          style={{
            background: "hsl(220 25% 10%)",
            border: `1px solid ${color}`,
            color,
            fontSize: "8px",
            fontWeight: 700,
            fontFamily: "monospace",
            boxShadow: `0 0 6px ${color}66`,
          }}
        >
          {fragment.fragmentIndex + 1}
        </div>
      </div>

      {/* Country code label */}
      <p
        className="text-center font-display mt-1.5 tracking-widest"
        style={{ color, fontSize: "9px", textShadow: `0 0 8px ${color}88` }}
      >
        {fragment.countryCode}
      </p>
    </motion.div>
  );
};

// ─── Fragment Detail Modal ─────────────────────────────────────────────────────

interface FragmentReward {
  id: string;
  name: string;
  concept: string;
  unlocked_message: string;
}

interface CountryJSONData {
  fragment_reward?: FragmentReward;
  question_bank?: Array<{ type: string; narrative_unlock?: string }>;
}

const FragmentDetailModal = ({
  fragment,
  onClose,
  onPlaceOnMap,
}: {
  fragment: Fragment;
  onClose: () => void;
  onPlaceOnMap: () => void;
}) => {
  const [countryData, setCountryData] = useState<CountryJSONData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/content/countries/${fragment.countryCode}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setCountryData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [fragment.countryCode]);

  const color = COUNTRY_COLORS[fragment.countryCode] || COUNTRY_COLORS.DEFAULT;
  const flag = FLAG_EMOJIS[fragment.countryCode] || "🏳️";
  const path = PIECE_PATHS[fragment.fragmentIndex % PIECE_PATHS.length];
  const gradId = `detail-grad-${fragment.id}`;
  const glowId = `detail-glow-${fragment.id}`;
  const shineId = `detail-shine-${fragment.id}`;

  const narrativeUnlocks = countryData?.question_bank
    ?.filter(q => q.type === "C" && q.narrative_unlock)
    .map(q => q.narrative_unlock as string) ?? [];

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-background/85 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        className="relative w-full max-w-md bg-card border rounded-2xl overflow-hidden shadow-2xl"
        style={{
          borderColor: `${color}44`,
          boxShadow: `0 0 60px ${color}20, 0 20px 60px rgba(0,0,0,0.5)`,
        }}
        initial={{ scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        {/* Header gradient */}
        <div
          className="px-6 pt-6 pb-5 border-b"
          style={{
            background: `linear-gradient(135deg, ${color}12 0%, transparent 60%)`,
            borderColor: `${color}25`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-5">
            {/* Large 3D piece */}
            <div className="relative flex-shrink-0" style={{ perspective: "500px" }}>
              <motion.div
                style={{ transform: "rotateX(10deg) rotateY(-10deg)", transformStyle: "preserve-3d" }}
                animate={{ rotateY: [-10, 10, -10] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              >
                {/* Halo */}
                <motion.div
                  className="absolute inset-0 rounded-xl blur-xl"
                  style={{ background: color, opacity: 0.3 }}
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                />
                <svg
                  width={110}
                  height={110}
                  viewBox="0 0 24 24"
                  className="relative z-10"
                  style={{ filter: `drop-shadow(0 10px 24px ${color}66) drop-shadow(0 3px 6px rgba(0,0,0,0.7))` }}
                >
                  <defs>
                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="110%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                      <stop offset="30%" stopColor={color} stopOpacity="1" />
                      <stop offset="80%" stopColor={color} stopOpacity="0.85" />
                      <stop offset="100%" stopColor="hsl(220 25% 6%)" stopOpacity="0.95" />
                    </linearGradient>
                    <linearGradient id={shineId} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.55" />
                      <stop offset="50%" stopColor="white" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                    <filter id={glowId}>
                      <feGaussianBlur stdDeviation="0.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path d={path} fill="hsl(220 30% 3%)" transform="translate(1.5 2)" opacity="0.7" />
                  <path d={path} fill="hsl(220 25% 8%)" transform="translate(0.7 0.9)" opacity="0.5" />
                  <path d={path} fill={`url(#${gradId})`} stroke={color} strokeWidth="0.6" filter={`url(#${glowId})`} />
                  <path d={path} fill={`url(#${shineId})`} opacity="0.65" />
                  <path d={path} fill="none" stroke="white" strokeWidth="0.3" opacity="0.18" strokeDasharray="1.5 2.5" />
                </svg>
              </motion.div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{flag}</span>
                <h3 className="font-display font-bold text-lg tracking-wider" style={{ color }}>
                  {fragment.countryName.toUpperCase()}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground font-display tracking-widest">
                FRAGMENT #{fragment.fragmentIndex + 1}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-display tracking-wider">CHARGEMENT...</p>
            </div>
          ) : (
            <>
              {countryData?.fragment_reward && (
                <div
                  className="rounded-lg p-4 space-y-3"
                  style={{
                    background: `${color}0D`,
                    border: `1px solid ${color}30`,
                  }}
                >
                  <p className="text-xs font-display tracking-widest text-muted-foreground">DONNÉES DU FRAGMENT</p>
                  <div>
                    <p className="text-xs text-muted-foreground font-display tracking-wider">NOM</p>
                    <p className="text-sm font-display font-bold" style={{ color }}>
                      {countryData.fragment_reward.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-display tracking-wider">CONCEPT GÉOPOLITIQUE</p>
                    <p
                      className="text-xs font-display font-bold tracking-widest px-2 py-1 rounded inline-block mt-0.5"
                      style={{ background: `${color}20`, color }}
                    >
                      {countryData.fragment_reward.concept}
                    </p>
                  </div>
                  <div className="pt-2 border-t" style={{ borderColor: `${color}20` }}>
                    <p className="text-xs text-muted-foreground font-display tracking-wider mb-1">INDICE NARRATIF</p>
                    <p className="text-sm italic leading-relaxed" style={{ color: `${color}` }}>
                      « {countryData.fragment_reward.unlocked_message} »
                    </p>
                  </div>
                </div>
              )}

              {narrativeUnlocks.length > 0 && (
                <div>
                  <p className="text-xs font-display tracking-widest text-muted-foreground mb-2">RÉVÉLATIONS DE L'ENQUÊTE</p>
                  <div className="space-y-2">
                    {narrativeUnlocks.map((unlock, i) => (
                      <motion.div
                        key={i}
                        className="flex items-start gap-2 px-3 py-2 rounded-lg"
                        style={{ background: "hsl(220 20% 8%)", border: "1px solid hsl(220 20% 15%)" }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                        <p className="text-xs text-foreground italic leading-relaxed">
                          {unlock}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {!countryData?.fragment_reward && !loading && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground font-display tracking-wider">
                    DONNÉES NARRATIVES INDISPONIBLES
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 font-display tracking-wider text-xs"
            onClick={onClose}
          >
            FERMER
          </Button>
          {!fragment.isPlaced && (
            <Button
              className="flex-1 font-display tracking-wider text-xs gap-2"
              style={{ background: color }}
              onClick={onPlaceOnMap}
            >
              <MapPin className="h-3.5 w-3.5" />
              PLACER SUR LA CARTE
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const FragmentInventory = ({
  fragments,
  draggingId,
  onDragStart,
  onDragEnd,
}: FragmentInventoryProps) => {
  const [selectedFragment, setSelectedFragment] = useState<Fragment | null>(null);

  const unplaced = fragments.filter(f => !f.isPlaced);
  const placed = fragments.filter(f => f.isPlaced);

  const handlePlaceOnMap = () => {
    setSelectedFragment(null);
    // Scroll to map
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
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
              <span className="text-primary">{unplaced.length}</span> disponibles ·{" "}
              <span className="text-muted-foreground">{placed.length}</span> placés
            </span>
            {unplaced.length > 0 && (
              <div className="flex items-center gap-1 text-xs font-display text-primary/60 tracking-wider">
                <Sparkles className="h-3 w-3" />
                GLISSEZ OU CLIQUEZ
              </div>
            )}
          </div>
        </div>

        {/* Fragment grid */}
        <div className="px-5 py-5">
          {unplaced.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-3xl mb-2 opacity-30">🧩</div>
              <p className="text-xs font-display text-muted-foreground tracking-wider">
                {placed.length > 0
                  ? "TOUS LES FRAGMENTS ONT ÉTÉ PLACÉS"
                  : "AUCUN FRAGMENT — COMPLÉTEZ DES MISSIONS"}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-5 justify-center">
                <AnimatePresence>
                  {unplaced.map((fragment, i) => (
                    <motion.div
                      key={fragment.id}
                      initial={{ opacity: 0, scale: 0, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0, y: -10 }}
                      transition={{ delay: i * 0.06, type: "spring", stiffness: 300 }}
                    >
                      <FragmentPiece3D
                        fragment={fragment}
                        isDragging={draggingId === fragment.id}
                        onDragStart={() => onDragStart(fragment.id)}
                        onDragEnd={onDragEnd}
                        onClick={() => setSelectedFragment(fragment)}
                        size={56}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <p className="text-center text-xs text-muted-foreground/40 font-display tracking-wider mt-5">
                — CLIQUEZ POUR VOIR LE DÉTAIL · GLISSEZ POUR PLACER —
              </p>
            </>
          )}
        </div>

        {/* Placed fragments */}
        {placed.length > 0 && (
          <div className="border-t border-border/50 px-5 py-3">
            <p className="text-xs font-display text-muted-foreground tracking-wider mb-2">FRAGMENTS INTÉGRÉS</p>
            <div className="flex flex-wrap gap-1.5">
              {placed.map(f => (
                <div
                  key={f.id}
                  className="text-xs font-display px-2 py-0.5 rounded cursor-pointer"
                  style={{
                    background: "hsl(40 80% 55% / 0.1)",
                    border: "1px solid hsl(40 80% 55% / 0.3)",
                    color: "hsl(40 80% 65%)",
                  }}
                  onClick={() => setSelectedFragment(f)}
                  title="Voir les détails"
                >
                  {f.countryCode}-{f.fragmentIndex + 1}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selectedFragment && (
          <FragmentDetailModal
            fragment={selectedFragment}
            onClose={() => setSelectedFragment(null)}
            onPlaceOnMap={handlePlaceOnMap}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default FragmentInventory;
