import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Puzzle, MapPin, ArrowRight, Shield, Sparkles, Eye, EyeOff } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const MissionComplete = () => {
  const { countryId } = useParams<{ countryId: string }>();
  const [searchParams] = useSearchParams();
  const score = parseInt(searchParams.get("score") || "0");
  const total = parseInt(searchParams.get("total") || "4");
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<"reveal" | "hint" | "map">("reveal");
  const [country, setCountry] = useState<Tables<"countries"> | null>(null);
  const [nextCountry, setNextCountry] = useState<Tables<"countries"> | null>(null);
  const [storyState, setStoryState] = useState({ trust_level: 50, suspicion_level: 0 });
  const [puzzleProgress, setPuzzleProgress] = useState({ unlocked: 0, total: 0 });
  const [missionFragment, setMissionFragment] = useState("");

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (!countryId) { navigate("/dashboard"); return; }

    const load = async () => {
      const [countryRes, countriesRes, stateRes, piecesRes, missionRes] = await Promise.all([
        supabase.from("countries").select("*").eq("id", countryId).single(),
        supabase.from("countries").select("*").order("difficulty_base"),
        supabase.from("user_story_state").select("*").eq("user_id", user.id).single(),
        supabase.from("puzzle_pieces").select("*").eq("user_id", user.id).eq("unlocked", true),
        supabase.from("missions").select("mission_data").eq("user_id", user.id).eq("country_id", countryId).order("created_at", { ascending: false }).limit(1).single(),
      ]);

      if (countryRes.data) setCountry(countryRes.data);
      if (stateRes.data) setStoryState({ trust_level: stateRes.data.trust_level, suspicion_level: stateRes.data.suspicion_level });

      const pieces = piecesRes.data || [];
      const allCountries = countriesRes.data || [];
      const completedCountryIds = [...new Set(pieces.map(p => p.country_id))];

      setPuzzleProgress({ unlocked: pieces.length, total: allCountries.length * 5 });

      // Find next uncompleted country by difficulty
      const next = allCountries.find(c => !completedCountryIds.includes(c.id) && c.id !== countryId);
      if (next) setNextCountry(next);

      // Get fragment from mission data
      if (missionRes.data?.mission_data) {
        const data = missionRes.data.mission_data as any;
        setMissionFragment(data.final_fragment || data.next_hint || "");
      }
    };

    load();
  }, [user, countryId]);

  const progressPercent = puzzleProgress.total > 0 ? Math.round((puzzleProgress.unlocked / puzzleProgress.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-display text-sm text-primary tracking-wider">DEBRIEFING</span>
          </div>
          <span className="text-xs text-muted-foreground font-display tracking-wider">
            {country?.name?.toUpperCase()} — MISSION COMPLÈTE
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">
            {/* Phase 1: Puzzle Reveal */}
            {phase === "reveal" && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className="space-y-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.3, stiffness: 200 }}
                >
                  <Puzzle className="h-20 w-20 text-primary mx-auto" />
                </motion.div>

                <div>
                  <h1 className="text-3xl font-display font-bold text-primary text-glow tracking-wider mb-2">
                    PIÈCE DÉBLOQUÉE
                  </h1>
                  <p className="text-muted-foreground">
                    Une nouvelle pièce du puzzle mondial a été ajoutée à votre collection.
                  </p>
                </div>

                {/* Score */}
                <div className="bg-card border border-border rounded-lg p-6 border-glow">
                  <p className="text-5xl font-display font-bold text-primary mb-1">{score}/{total}</p>
                  <p className="text-sm text-muted-foreground font-display tracking-wider">ÉNIGMES RÉSOLUES</p>
                  <div className="mt-4 text-xs text-muted-foreground">
                    +{score * 25 + 50} XP gagnés
                  </div>
                </div>

                {/* Global progress */}
                <div className="bg-card border border-border rounded-lg p-5">
                  <div className="flex justify-between text-sm font-display mb-2">
                    <span className="text-muted-foreground tracking-wider">PUZZLE MONDIAL</span>
                    <span className="text-primary">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {puzzleProgress.unlocked} / {puzzleProgress.total} pièces
                  </p>
                </div>

                {/* Story state indicators */}
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

                <Button
                  onClick={() => setPhase("hint")}
                  className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 py-6"
                >
                  VOIR L'INDICE SUIVANT
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Phase 2: Narrative Hint */}
            {phase === "hint" && (
              <motion.div
                key="hint"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-display font-bold text-primary text-glow tracking-wider">
                    TRANSMISSION INTERCEPTÉE
                  </h2>
                </div>

                {/* Fragment narratif */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-card border border-primary/30 rounded-lg p-6 border-glow relative overflow-hidden"
                >
                  <div className="scanline absolute inset-0 pointer-events-none" />
                  <p className="text-foreground leading-relaxed italic relative z-10">
                    "{missionFragment}"
                  </p>
                </motion.div>

                {/* Next country teaser */}
                {nextCountry && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 }}
                    className="bg-card border border-border rounded-lg p-5"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <p className="text-xs font-display text-primary tracking-wider">PROCHAINE DESTINATION</p>
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground tracking-wider mb-2">
                      {nextCountry.name.toUpperCase()}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {nextCountry.description || `Difficulté: ${nextCountry.difficulty_base}/10`}
                    </p>
                    {storyState.suspicion_level > 30 && (
                      <p className="text-xs text-destructive mt-3 font-display tracking-wider">
                        ⚠ VOTRE NIVEAU DE SUSPICION ÉLEVÉ RENDRA CETTE MISSION PLUS DIFFICILE
                      </p>
                    )}
                  </motion.div>
                )}

                {!nextCountry && (
                  <div className="bg-card border border-primary/20 rounded-lg p-5 text-center">
                    <p className="text-primary font-display tracking-wider text-sm">
                      TOUTES LES MISSIONS DISPONIBLES SONT COMPLÉTÉES
                    </p>
                    <p className="text-muted-foreground text-xs mt-2">De nouvelles destinations seront bientôt déclassifiées...</p>
                  </div>
                )}

                <div className="flex gap-3">
                  {nextCountry && (
                    <Button
                      onClick={() => navigate(`/mission/${nextCountry.id}`)}
                      className="flex-1 font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 py-6"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      PROCHAINE MISSION
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => navigate("/puzzle")}
                    className="flex-1 font-display tracking-wider border-primary/50 text-primary hover:bg-primary/10 py-6"
                  >
                    <Puzzle className="h-4 w-4 mr-2" />
                    VOIR LE PUZZLE
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => navigate("/dashboard")}
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
