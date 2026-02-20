import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Package, X, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WEPPuzzlePiece } from "@/components/WEPPuzzlePiece";
import { useIsMobile } from "@/hooks/use-mobile";

export interface Fragment {
  id: string;
  countryId: string;
  countryCode: string;
  countryName: string;
  fragmentIndex: number;
  isPlaced: boolean;
}

export interface TokenData {
  countryCode: string;
  letter: string;
  revealed: boolean;
}

interface FragmentInventoryProps {
  fragments: Fragment[];
  tokens?: TokenData[];
  draggingId: string | null;
  onDragStart: (fragmentId: string) => void;
  onDragEnd: () => void;
  selectedForPlacement?: string | null;
  onSelectForPlacement?: (fragmentId: string | null) => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const FLAG_EMOJIS: Record<string, string> = {
  CH: "🇨🇭", JP: "🇯🇵", EG: "🇪🇬", FR: "🇫🇷", US: "🇺🇸",
  DE: "🇩🇪", IT: "🇮🇹", ES: "🇪🇸", GB: "🇬🇧", BR: "🇧🇷",
  CN: "🇨🇳", IN: "🇮🇳", RU: "🇷🇺", MA: "🇲🇦", GR: "🇬🇷",
};

// ─── Fragment Piece Wrapper (draggable WEPPuzzlePiece) ──────────────────────────

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
  return (
    <motion.div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="relative cursor-pointer select-none"
      whileHover={{ scale: 1.15, y: -6 }}
      whileTap={{ scale: 0.93 }}
      animate={isDragging ? { opacity: 0.4, scale: 0.85 } : { opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 22 }}
      title={`${fragment.countryName} — cliquez pour détails`}
    >
      <WEPPuzzlePiece
        countryCode={fragment.countryCode}
        size={size}
        animated={!isDragging}
        mode="inventory"
        showKeyword={false}
      />
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

  const flag = FLAG_EMOJIS[fragment.countryCode] || "🏳️";

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
        className="relative w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
        initial={{ scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-border bg-gradient-to-br from-primary/8 to-transparent">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-5">
            {/* WEP Piece — detail mode (slow rotation) */}
            <div className="flex-shrink-0">
              <WEPPuzzlePiece
                countryCode={fragment.countryCode}
                size={110}
                animated={true}
                mode="detail"
                showKeyword={true}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{flag}</span>
                <h3 className="font-display font-bold text-lg tracking-wider text-primary">
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
                  className="rounded-lg p-4 space-y-3 border border-primary/25"
                  style={{ background: "hsl(var(--primary) / 0.06)" }}
                >
                  <p className="text-xs font-display tracking-widest text-muted-foreground">DONNÉES DU FRAGMENT</p>
                  <div>
                    <p className="text-xs text-muted-foreground font-display tracking-wider">NOM</p>
                    <p className="text-sm font-display font-bold text-primary">
                      {countryData.fragment_reward.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-display tracking-wider">CONCEPT GÉOPOLITIQUE</p>
                    <p className="text-xs font-display font-bold tracking-widest px-2 py-1 rounded inline-block mt-0.5 text-primary bg-primary/15">
                      {countryData.fragment_reward.concept}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-primary/20">
                    <p className="text-xs text-muted-foreground font-display tracking-wider mb-1">INDICE NARRATIF</p>
                    <p className="text-sm italic leading-relaxed text-primary">
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
                        className="flex items-start gap-2 px-3 py-2 rounded-lg bg-secondary border border-border"
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
              className="flex-1 font-display tracking-wider text-xs gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
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
  tokens = [],
  draggingId,
  onDragStart,
  onDragEnd,
  selectedForPlacement,
  onSelectForPlacement,
}: FragmentInventoryProps) => {
  const [selectedFragment, setSelectedFragment] = useState<Fragment | null>(null);
  const isMobile = useIsMobile();
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
                {isMobile ? "TAPEZ POUR SÉLECTIONNER" : "GLISSEZ OU CLIQUEZ"}
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
                        onDragStart={() => !isMobile && onDragStart(fragment.id)}
                        onDragEnd={() => !isMobile && onDragEnd()}
                        onClick={() => {
                          if (isMobile && onSelectForPlacement) {
                            // Toggle selection for tap-to-place
                            onSelectForPlacement(selectedForPlacement === fragment.id ? null : fragment.id);
                          } else {
                            setSelectedFragment(fragment);
                          }
                        }}
                        size={56}
                      />
                      {/* Mobile selection indicator */}
                      {isMobile && selectedForPlacement === fragment.id && (
                        <motion.div
                          className="absolute -inset-1 rounded-lg border-2 pointer-events-none"
                          style={{ borderColor: "hsl(40 85% 62%)", boxShadow: "0 0 12px hsl(40 85% 62% / 0.5)" }}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                        />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <p className="text-center text-xs text-muted-foreground/40 font-display tracking-wider mt-5">
                {isMobile
                  ? "— TAPEZ UN FRAGMENT · PUIS TAPEZ LE PAYS SUR LA CARTE —"
                  : "— CLIQUEZ POUR VOIR LE DÉTAIL · GLISSEZ POUR PLACER —"}
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

        {/* Collected tokens (letters) — masked until set complete */}
        {tokens.length > 0 && (() => {
          const SIGNAL_CODES = ["CH", "FR", "EG", "US", "JP"];
          const allSignalCollected = SIGNAL_CODES.every(code =>
            tokens.some(t => t.countryCode === code)
          );
          return (
            <div className="border-t border-border/50 px-5 py-3">
              <p className="text-xs font-display text-muted-foreground tracking-wider mb-2">
                TOKENS COLLECTÉS ({tokens.length})
                {!allSignalCollected && (
                  <span className="ml-2 text-[9px]" style={{ color: "hsl(40 60% 50%)" }}>
                    — {5 - tokens.length} RESTANTS POUR RÉVÉLER
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {tokens.map(t => (
                  <div
                    key={t.countryCode}
                    className="flex items-center gap-1.5 text-xs font-display px-2.5 py-1 rounded"
                    style={{
                      background: "hsl(40 80% 55% / 0.08)",
                      border: `1px solid hsl(40 80% 55% / ${allSignalCollected ? "0.4" : "0.15"})`,
                    }}
                  >
                    <span
                      className="text-sm font-bold"
                      style={{
                        color: allSignalCollected ? "hsl(40 85% 62%)" : "hsl(40 60% 40%)",
                        filter: allSignalCollected ? "none" : "blur(5px)",
                        userSelect: "none",
                      }}
                    >
                      {t.letter}
                    </span>
                    <span style={{ color: "hsl(40 80% 65% / 0.6)" }}>
                      {t.countryCode}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
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
