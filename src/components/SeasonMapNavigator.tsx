import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import CinematicWorldMap from "@/components/CinematicWorldMap";
import type { MapCountry } from "@/components/CinematicWorldMap";
import UpgradeModal from "@/components/UpgradeModal";

// ── Season config ─────────────────────────────────────────────────────────────

interface SeasonInfo {
  label: string;
  codename: string;
  color: string;
  countLabel: string;
  entitlementKey: "season_1" | "season_2" | "season_3" | "season_4";
  upgradeKey: "season_1" | "season_2" | "season_3" | "season_4";
}

const SEASONS: { seasonNumber: number; info: SeasonInfo | null }[] = [
  { seasonNumber: 0, info: null }, // Free — always unlocked
  {
    seasonNumber: 1,
    info: {
      label: "LES OBSERVATEURS",
      codename: "SAISON I",
      color: "hsl(220 80% 65%)",
      countLabel: "43 PAYS",
      entitlementKey: "season_1",
      upgradeKey: "season_1",
    },
  },
  {
    seasonNumber: 2,
    info: {
      label: "LES ARCHITECTES",
      codename: "SAISON II",
      color: "hsl(160 60% 52%)",
      countLabel: "72 PAYS",
      entitlementKey: "season_2",
      upgradeKey: "season_2",
    },
  },
  {
    seasonNumber: 3,
    info: {
      label: "LA FAILLE",
      codename: "SAISON III",
      color: "hsl(280 65% 62%)",
      countLabel: "40 PAYS",
      entitlementKey: "season_3",
      upgradeKey: "season_3",
    },
  },
  {
    seasonNumber: 4,
    info: {
      label: "LE PROTOCOLE FINAL",
      codename: "SAISON IV",
      color: "hsl(0 70% 58%)",
      countLabel: "35 PAYS",
      entitlementKey: "season_4",
      upgradeKey: "season_4",
    },
  },
];

const DOT_COLORS = [
  "hsl(40 85% 62%)",   // S0 — gold
  "hsl(220 80% 65%)",  // S1 — blue
  "hsl(160 60% 52%)",  // S2 — green
  "hsl(280 65% 62%)",  // S3 — purple
  "hsl(0 70% 58%)",    // S4 — red
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface SeasonMapNavigatorProps {
  countries: MapCountry[];
  entitlements: Set<string>; // e.g. {"season_1", "season_2"}
  draggingFragmentId: string | null;
  placedCountryIds: string[];
  onDropOnCountry: (countryId: string) => void;
  onDropOnMap?: (dropX: number, dropY: number) => void;
  onCountryClick: (country: MapCountry) => void;
  globalProgress?: number;
  collectedCountryCodes?: string[];
  forceFullReveal?: boolean;
  snapTargetId?: string | null;
  milestoneSignal?: boolean;
  introPhase?: "full_reveal" | "fading" | "normal";
}

// ── Component ─────────────────────────────────────────────────────────────────

const SeasonMapNavigator = ({
  countries,
  entitlements,
  draggingFragmentId,
  placedCountryIds,
  onDropOnCountry,
  onDropOnMap,
  onCountryClick,
  globalProgress = 0,
  collectedCountryCodes = [],
  forceFullReveal = false,
  snapTargetId = null,
  milestoneSignal = false,
  introPhase = "normal",
}: SeasonMapNavigatorProps) => {
  const [activeSeason, setActiveSeason] = useState(0);
  const [upgradeTarget, setUpgradeTarget] = useState<"season_1" | "season_2" | "season_3" | "season_4" | null>(null);
  const touchStartX = useRef<number | null>(null);

  const currentSeason = SEASONS[activeSeason];
  const isUnlocked = activeSeason === 0 || entitlements.has(currentSeason.info?.entitlementKey ?? "");

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < SEASONS.length) setActiveSeason(idx);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0 && activeSeason < SEASONS.length - 1) goTo(activeSeason + 1);
      if (diff > 0 && activeSeason > 0) goTo(activeSeason - 1);
    }
    touchStartX.current = null;
  };

  return (
    <div className="relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* ── Map with season filter ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSeason}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <CinematicWorldMap
            countries={countries}
            seasonFilter={SEASONS[activeSeason].seasonNumber}
            draggingFragmentId={draggingFragmentId}
            placedCountryIds={placedCountryIds}
            onDropOnCountry={onDropOnCountry}
            onDropOnMap={onDropOnMap}
            onCountryClick={onCountryClick}
            globalProgress={globalProgress}
            collectedCountryCodes={collectedCountryCodes}
            forceFullReveal={forceFullReveal}
            snapTargetId={snapTargetId}
            milestoneSignal={milestoneSignal}
            introPhase={introPhase}
          />
        </motion.div>
      </AnimatePresence>

      {/* ── Locked overlay ── */}
      <AnimatePresence>
        {!isUnlocked && currentSeason.info && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl"
            style={{ background: "hsl(220 25% 4% / 0.88)", backdropFilter: "blur(4px)" }}
          >
            <div className="text-center px-6">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full border mb-5"
                style={{
                  borderColor: currentSeason.info.color,
                  background: `${currentSeason.info.color.replace(")", " / 0.1)")}`,
                  boxShadow: `0 0 30px ${currentSeason.info.color.replace(")", " / 0.25)")}`,
                }}
              >
                <Lock className="h-7 w-7" style={{ color: currentSeason.info.color }} />
              </motion.div>

              <p
                className="text-xs font-display tracking-[0.3em] mb-2"
                style={{ color: currentSeason.info.color }}
              >
                {currentSeason.info.codename}
              </p>
              <h3
                className="text-xl font-display font-bold tracking-wider mb-3"
                style={{ color: currentSeason.info.color }}
              >
                {currentSeason.info.label}
              </h3>
              <p className="text-sm text-muted-foreground font-display tracking-wider mb-6">
                {currentSeason.info.countLabel} · 29 CHF
              </p>

              <Button
                className="font-display tracking-wider gap-2"
                onClick={() => setUpgradeTarget(currentSeason.info!.upgradeKey)}
              >
                <Shield className="h-4 w-4" />
                DÉBLOQUER CETTE SAISON
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation arrows ── */}
      {activeSeason > 0 && (
        <button
          onClick={() => goTo(activeSeason - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-40 p-2 rounded-full border transition-all hover:scale-110"
          style={{
            background: "hsl(220 25% 6% / 0.8)",
            borderColor: "hsl(40 80% 55% / 0.3)",
            color: "hsl(40 80% 65%)",
          }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {activeSeason < SEASONS.length - 1 && (
        <button
          onClick={() => goTo(activeSeason + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-40 p-2 rounded-full border transition-all hover:scale-110"
          style={{
            background: "hsl(220 25% 6% / 0.8)",
            borderColor: "hsl(40 80% 55% / 0.3)",
            color: "hsl(40 80% 65%)",
          }}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* ── Season dots ── */}
      <div className="flex items-center justify-center gap-2.5 mt-4">
        {SEASONS.map((s, idx) => {
          const isActive = idx === activeSeason;
          const unlocked = idx === 0 || entitlements.has(s.info?.entitlementKey ?? "");
          return (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className="relative flex flex-col items-center gap-1 group transition-all"
            >
              <motion.div
                animate={{
                  width: isActive ? 14 : 8,
                  height: isActive ? 14 : 8,
                  opacity: isActive ? 1 : unlocked ? 0.7 : 0.35,
                }}
                transition={{ duration: 0.2 }}
                className="rounded-full border"
                style={{
                  background: DOT_COLORS[idx],
                  borderColor: isActive ? DOT_COLORS[idx] : "transparent",
                  boxShadow: isActive ? `0 0 10px ${DOT_COLORS[idx]}` : "none",
                }}
              />
              {!unlocked && (
                <Lock className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5" style={{ color: DOT_COLORS[idx] }} />
              )}
              {isActive && (
                <span
                  className="text-[8px] font-display tracking-wider whitespace-nowrap"
                  style={{ color: DOT_COLORS[idx] }}
                >
                  {idx === 0 ? "SIGNAL INITIAL" : s.info?.codename}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Upgrade modal ── */}
      <UpgradeModal
        open={!!upgradeTarget}
        onClose={() => setUpgradeTarget(null)}
        season={upgradeTarget ?? "season_1"}
      />
    </div>
  );
};

export default SeasonMapNavigator;
