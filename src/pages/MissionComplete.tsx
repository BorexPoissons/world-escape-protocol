import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Puzzle, MapPin, ArrowRight, Shield, Eye, EyeOff, Home, Trophy, Flame } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { BADGE_META, type BadgeKey } from "@/lib/badges";
import missionCompleteCH from "@/assets/mission-complete-ch.png";
import { WEPPuzzlePiece } from "@/components/WEPPuzzlePiece";

// ── Fixed SIGNAL_INITIAL sequence (free phase — deterministic) ────────────────
const SIGNAL_INITIAL_SEQUENCE = ["CH", "US", "CN", "BR", "EG"];

function getNextSignalInitialCode(currentCode: string): string | null {
  const idx = SIGNAL_INITIAL_SEQUENCE.indexOf(currentCode);
  if (idx === -1 || idx === SIGNAL_INITIAL_SEQUENCE.length - 1) return null;
  return SIGNAL_INITIAL_SEQUENCE[idx + 1];
}

// Map country code → cinematic image (add more as you create them)
const CINEMATIC_IMAGES: Record<string, string> = {
  CH: missionCompleteCH,
};

const MissionComplete = () => {
  const { countryId } = useParams<{ countryId: string }>();
  const [searchParams] = useSearchParams();
  const score = parseInt(searchParams.get("score") || "0");
  const total = parseInt(searchParams.get("total") || "4");
  const xpGained = parseInt(searchParams.get("xp") || "0");
  const streak = parseInt(searchParams.get("streak") || "0");
  const isDemo = searchParams.get("demo") === "1";

  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<"reveal" | "hint">("reveal");
  const [country, setCountry] = useState<Tables<"countries"> | null>(null);
  const [nextCountry, setNextCountry] = useState<Tables<"countries"> | null>(null);
  const [fragmentName, setFragmentName] = useState<string>("");
  const [fragmentConcept, setFragmentConcept] = useState<string>("");
  const [storyState, setStoryState] = useState({ trust_level: 50, suspicion_level: 0 });
  const [puzzleProgress, setPuzzleProgress] = useState({ unlocked: 0, total: 195 });
  const [newBadges, setNewBadges] = useState<BadgeKey[]>([]);

  useEffect(() => {
    if (!countryId) { navigate("/dashboard"); return; }

    const load = async () => {
      const { data: countryData } = await supabase
        .from("countries").select("*").eq("id", countryId).single();
      if (!countryData) return;
      setCountry(countryData);

      try {
        const res = await fetch(`/content/countries/${countryData.code}.json`);
        if (res.ok) {
          const json = await res.json();
          if (json.fragment_reward) {
            setFragmentName(json.fragment_reward.name ?? "");
            setFragmentConcept(json.fragment_reward.concept ?? "");
          }
        }
      } catch { /* no static file */ }

      const nextCode = getNextSignalInitialCode(countryData.code);
      if (nextCode) {
        const { data: nextData } = await supabase
          .from("countries").select("*").eq("code", nextCode).single();
        if (nextData) setNextCountry(nextData);
      } else {
        const { data: season1 } = await supabase
          .from("countries").select("*").eq("season_number", 1).order("release_order").limit(1).single();
        if (season1) setNextCountry(season1);
      }

      if (user) {
        const [stateRes, fragmentsRes, badgesRes] = await Promise.all([
          supabase.from("user_story_state").select("*").eq("user_id", user.id).single(),
          supabase.from("user_fragments" as any).select("id").eq("user_id", user.id),
          supabase.from("user_badges").select("badge_key").eq("user_id", user.id).order("awarded_at", { ascending: false }).limit(5),
        ]);

        if (stateRes.data) setStoryState({
          trust_level: stateRes.data.trust_level,
          suspicion_level: stateRes.data.suspicion_level,
        });

        const fragmentCount = (fragmentsRes.data as any[])?.length ?? 0;
        setPuzzleProgress({ unlocked: fragmentCount, total: 195 });

        if (badgesRes.data) setNewBadges(badgesRes.data.map((b: any) => b.badge_key));
      } else {
        try {
          const raw = localStorage.getItem("wep_demo_story");
          if (raw) setStoryState(JSON.parse(raw));
        } catch {}
        setPuzzleProgress({ unlocked: 1, total: 195 });
      }
    };

    load();
  }, [user, countryId]);

  const progressPercent = Math.round((puzzleProgress.unlocked / puzzleProgress.total) * 100 * 100) / 100;
  const isPerfect = score === total && total > 0;
  const isLastFreeCountry = country ? SIGNAL_INITIAL_SEQUENCE.indexOf(country.code) === SIGNAL_INITIAL_SEQUENCE.length - 1 : false;
  const cinematicImg = country ? CINEMATIC_IMAGES[country.code] : null;

  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Home className="h-4 w-4" />
              <span className="text-xs font-display tracking-wider hidden sm:inline">ACCUEIL</span>
            </Link>
            <span className="text-border">|</span>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-display text-sm text-primary tracking-wider">DEBRIEFING</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground font-display tracking-wider">
            {country?.name?.toUpperCase()} — MISSION COMPLÈTE
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">

            {/* ── Phase 1: Result Reveal ── */}
            {phase === "reveal" && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className="space-y-6 text-center"
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3, stiffness: 200 }}>
                  {isPerfect
                    ? <Trophy className="h-20 w-20 text-primary mx-auto" />
                    : <Puzzle className="h-20 w-20 text-primary mx-auto" />
                  }
                </motion.div>

                <div>
                  <h1 className="text-3xl font-display font-bold text-primary text-glow tracking-wider mb-2">
                    {isPerfect ? "MISSION PARFAITE !" : "PIÈCE DÉBLOQUÉE"}
                  </h1>
                  <p className="text-muted-foreground">
                    {isPerfect
                      ? "Toutes les énigmes résolues sans erreur. Performance exemplaire."
                      : "Une nouvelle pièce du puzzle mondial a été ajoutée à votre collection."
                    }
                  </p>
                </div>

                {/* Score + XP */}
                <div className="bg-card border border-border rounded-lg p-6 border-glow">
                  <p className="text-5xl font-display font-bold text-primary mb-1">{score}/{total}</p>
                  <p className="text-sm text-muted-foreground font-display tracking-wider">ÉNIGMES RÉSOLUES</p>
                  <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                    <span className="text-primary font-display">+{xpGained || score * 25 + 50} XP</span>
                    {isPerfect && <span className="text-primary font-display">⭐ BONUS PARFAIT</span>}
                  </div>
                </div>

                {/* Streak */}
                {streak >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-card border border-primary/20 rounded-lg p-4 flex items-center gap-3"
                  >
                    <Flame className="h-6 w-6 text-primary" />
                    <div className="text-left">
                      <p className="text-xs font-display text-primary tracking-wider">SÉRIE EN COURS</p>
                      <p className="text-lg font-display font-bold text-foreground">{streak} missions consécutives · x{Math.min(1.5, 1 + streak * 0.1).toFixed(1)} XP</p>
                    </div>
                  </motion.div>
                )}

                {/* New badges */}
                {newBadges.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="space-y-2">
                    <p className="text-xs font-display text-primary tracking-wider text-center">🏅 NOUVEAUX BADGES</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {newBadges.slice(0, 5).map(key => {
                        const meta = BADGE_META[key];
                        return meta ? (
                          <div key={key} className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-3 py-1.5 text-xs font-display tracking-wider text-primary">
                            <span>{meta.icon}</span>
                            <span>{meta.name}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Global progress */}
                <div className="bg-card border border-border rounded-lg p-5">
                  <div className="flex justify-between text-sm font-display mb-2">
                    <span className="text-muted-foreground tracking-wider">PUZZLE MONDIAL</span>
                    <span className="text-primary">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">{puzzleProgress.unlocked} / {puzzleProgress.total} pièces</p>
                </div>

                {/* Story state */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-lg p-4 text-center">
                    <Eye className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground font-display tracking-wider mb-1">CONFIANCE</p>
                    <Progress value={storyState.trust_level} className="h-1.5" />
                    <p className="text-xs text-primary mt-1">{storyState.trust_level}%</p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4 text-center">
                    <EyeOff className="h-5 w-5 text-destructive mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground font-display tracking-wider mb-1">SUSPICION</p>
                    <Progress value={storyState.suspicion_level} className="h-1.5 [&>div]:bg-destructive" />
                    <p className="text-xs text-destructive mt-1">{storyState.suspicion_level}%</p>
                  </div>
                </div>

                {/* Demo CTA */}
                {isDemo && (
                  <div className="bg-card border border-dashed border-primary/40 rounded-lg p-5 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Créez un compte pour sauvegarder votre progression</p>
                    <Link to="/auth">
                      <Button className="font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90">
                        CRÉER UN COMPTE GRATUIT
                      </Button>
                    </Link>
                  </div>
                )}

                <Button onClick={() => setPhase("hint")} className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 py-6">
                  CONTINUER L'ENQUÊTE
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* ── Phase 2: Cinematic + Fragment + Next Mission ── */}
            {phase === "hint" && (
              <motion.div
                key="hint"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                {/* Cinematic image (country-specific) */}
                {cinematicImg && (
                  <motion.div
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className="relative rounded-xl overflow-hidden"
                    style={{ boxShadow: "0 0 60px hsl(40 80% 55% / 0.3)" }}
                  >
                     <img
                       src={cinematicImg}
                       alt={`Jasper Valcourt — Mission ${country?.name} complète`}
                       className="w-full object-contain"
                       style={{ maxHeight: "820px" }}
                     />
                    {/* Fade bottom into background */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
                      style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--background)))" }}
                    />
                  </motion.div>
                )}

                {/* Fragment unlocked header (only if no cinematic image) */}
                {!cinematicImg && (
                  <div className="text-center">
                    <motion.h2
                      className="text-2xl font-display font-bold text-primary text-glow tracking-wider"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      FRAGMENT DÉBLOQUÉ
                    </motion.h2>
                  </div>
                )}

                {/* WEP Unique Puzzle Piece — country-specific */}
                <div className="flex justify-center">
                  {country && (
                    <WEPPuzzlePiece
                      countryCode={country.code}
                      size={120}
                      animated={true}
                      mode="complete"
                      showKeyword={true}
                    />
                  )}
                </div>

                {/* Fragment info */}
                {fragmentName && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-card border border-primary/30 rounded-lg p-6 border-glow relative overflow-hidden text-center"
                  >
                    <div className="scanline absolute inset-0 pointer-events-none opacity-20" />
                    <p className="text-xs font-display tracking-[0.4em] mb-2 text-primary/60 relative z-10">FRAGMENT OBTENU</p>
                    <p className="text-xl font-display font-bold text-primary relative z-10">{fragmentName}</p>
                    {fragmentConcept && (
                      <p className="text-xs font-display tracking-widest mt-1 relative z-10 text-muted-foreground">
                        TYPE : {fragmentConcept}
                      </p>
                    )}
                    <motion.p
                      className="text-xs text-muted-foreground mt-3 relative z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.9 }}
                    >
                      Fragment ajouté à votre inventaire — consultez le Puzzle Mondial pour le placer.
                    </motion.p>
                  </motion.div>
                )}

                {/* Next country */}
                {nextCountry && !isLastFreeCountry && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="bg-card border border-border rounded-lg p-5"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <p className="text-xs font-display text-primary tracking-wider">PROCHAINE DESTINATION — SIGNAL INITIAL</p>
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground tracking-wider mb-2">
                      {nextCountry.name.toUpperCase()}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {nextCountry.description || `Mission ${SIGNAL_INITIAL_SEQUENCE.indexOf(nextCountry.code) + 1} / 5 — Phase gratuite`}
                    </p>
                  </motion.div>
                )}

                {/* Last free country complete */}
                {isLastFreeCountry && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="bg-card border border-primary/20 rounded-lg p-5 text-center"
                  >
                    <p className="text-primary font-display tracking-wider text-sm mb-2">🔐 OPÉRATION 0 COMPLÈTE</p>
                    <p className="text-muted-foreground text-xs">
                      Tous les pays gratuits ont été explorés. Passez à l'Opération I pour continuer l'enquête.
                    </p>
                  </motion.div>
                )}

                {storyState.suspicion_level > 30 && (
                  <p className="text-xs text-destructive font-display tracking-wider text-center">
                    ⚠ NIVEAU DE SUSPICION ÉLEVÉ — Chrono réduit & vies limitées
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  {nextCountry && !isLastFreeCountry ? (
                    <Button
                      onClick={() => navigate(`/mission/${nextCountry.id}`)}
                      className="flex-1 font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-sm gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      CONTINUER — {nextCountry.name.toUpperCase()}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate("/dashboard?refresh=1")}
                      className="flex-1 font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 py-6"
                    >
                      RETOUR AU QG
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => navigate("/puzzle")}
                    className="flex-1 font-display tracking-wider border-primary/50 text-primary hover:bg-primary/10 py-6"
                  >
                    <Puzzle className="h-4 w-4 mr-2" />
                    PUZZLE MONDIAL
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => navigate("/dashboard?refresh=1")}
                  className="w-full font-display tracking-wider text-muted-foreground hover:text-foreground"
                >
                  RETOUR AU QG
                </Button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default MissionComplete;
