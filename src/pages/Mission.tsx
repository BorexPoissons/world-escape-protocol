import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, BookOpen, Home } from "lucide-react";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

interface Enigme {
  question: string;
  type: string;
  choices: string[];
  answer: string;
}

interface MoralChoice {
  description: string;
  option_a: string;
  option_b: string;
  impact_a: { trust: number; suspicion: number };
  impact_b: { trust: number; suspicion: number };
}

interface MissionData {
  mission_title: string;
  intro: string;
  enigmes: Enigme[];
  false_hint: string;
  moral_choice: MoralChoice;
  final_fragment: string;
  historical_fact: string;
}

type Phase = "loading" | "intro" | "enigme" | "moral" | "finale";

const Mission = () => {
  const { countryId } = useParams<{ countryId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [country, setCountry] = useState<Tables<"countries"> | null>(null);
  const [mission, setMission] = useState<MissionData | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [currentEnigme, setCurrentEnigme] = useState(0);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);

  useEffect(() => {
    // Auth check disabled for demo — re-enable in production
    // if (!user) { navigate("/auth"); return; }
    if (!countryId) return;

    const loadMission = async () => {
      const { data: countryData } = await supabase
        .from("countries")
        .select("*")
        .eq("id", countryId)
        .single();

      if (!countryData) { navigate("/dashboard"); return; }
      setCountry(countryData);

      // Get story state
      let storyState = { trust_level: 50, suspicion_level: 0, secrets_unlocked: 0 };
      const { data: stateData } = await supabase
        .from("user_story_state")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (stateData) {
        storyState = {
          trust_level: stateData.trust_level,
          suspicion_level: stateData.suspicion_level,
          secrets_unlocked: stateData.secrets_unlocked,
        };
      }

      // Get profile for level
      const { data: profileData } = await supabase
        .from("profiles")
        .select("level")
        .eq("user_id", user.id)
        .single();

      // Generate mission via edge function
      try {
        const { data, error } = await supabase.functions.invoke("generate-mission", {
          body: {
            country: countryData,
            player_level: profileData?.level || 1,
            ...storyState,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setMission(data as MissionData);
        setPhase("intro");
      } catch (err: any) {
        toast({
          title: "Erreur de génération",
          description: err.message || "Impossible de générer la mission",
          variant: "destructive",
        });
        navigate("/dashboard");
      }
    };

    loadMission();
  }, [user, countryId]);

  const handleAnswer = (choice: string) => {
    if (answerRevealed || !mission) return;
    setSelectedAnswer(choice);
    setAnswerRevealed(true);

    const correct = choice === mission.enigmes[currentEnigme].answer;
    if (correct) {
      setScore(s => s + 1);
    } else {
      setErrors(e => e + 1);
    }
  };

  const nextStep = () => {
    if (!mission) return;
    setSelectedAnswer(null);
    setAnswerRevealed(false);

    if (currentEnigme < mission.enigmes.length - 1) {
      setCurrentEnigme(c => c + 1);
    } else {
      setPhase("moral");
    }
  };

  const handleMoralChoice = async (option: "a" | "b") => {
    if (!mission || !user) return;
    const impact = option === "a" ? mission.moral_choice.impact_a : mission.moral_choice.impact_b;

    // Update story state
    const { data: existing } = await supabase
      .from("user_story_state")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      await supabase.from("user_story_state").update({
        trust_level: Math.max(0, Math.min(100, existing.trust_level + (impact.trust || 0))),
        suspicion_level: Math.max(0, Math.min(100, existing.suspicion_level + (impact.suspicion || 0))),
      }).eq("user_id", user.id);
    } else {
      await supabase.from("user_story_state").insert({
        user_id: user.id,
        trust_level: 50 + (impact.trust || 0),
        suspicion_level: impact.suspicion || 0,
      });
    }

    setPhase("finale");
  };

  const completeMission = async () => {
    if (!user || !countryId || !mission) return;

    // Save mission
    await supabase.from("missions").insert({
      user_id: user.id,
      country_id: countryId,
      mission_title: mission.mission_title,
      mission_data: mission as any,
      completed: true,
      score,
      completed_at: new Date().toISOString(),
    });

    // Create puzzle piece
    await supabase.from("puzzle_pieces").insert({
      user_id: user.id,
      country_id: countryId,
      unlocked: true,
      unlocked_at: new Date().toISOString(),
    });

    // Update XP
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp, level")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      const newXp = profile.xp + score * 25 + 50;
      const newLevel = Math.floor(newXp / 200) + 1;
      await supabase.from("profiles").update({ xp: newXp, level: newLevel }).eq("user_id", user.id);
    }

    toast({ title: "Mission accomplie!", description: `Score: ${score}/${mission.enigmes.length} — Pièce du puzzle débloquée!` });
    navigate(`/mission/${countryId}/complete?score=${score}&total=${mission.enigmes.length}`);
  };

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-primary font-display tracking-widest animate-pulse-gold">
            GÉNÉRATION DE LA MISSION...
          </p>
          <p className="text-muted-foreground text-sm mt-2">L'IA prépare votre briefing</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Top bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Home className="h-4 w-4" />
              <span className="text-xs font-display tracking-wider hidden sm:inline">ACCUEIL</span>
            </Link>
            <span className="text-border">|</span>
            <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-display">RETOUR</span>
            </button>
          </div>
          <div className="text-sm font-display text-primary tracking-wider">
            {country?.name?.toUpperCase()}
          </div>
          {phase === "enigme" && mission && (
            <div className="text-sm text-muted-foreground font-display">
              {currentEnigme + 1}/{mission.enigmes.length}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* INTRO */}
          {phase === "intro" && mission && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <h1 className="text-3xl font-display font-bold text-primary text-glow tracking-wider">
                {mission.mission_title}
              </h1>
              <div className="bg-card border border-border rounded-lg p-6 border-glow">
                <p className="text-foreground leading-relaxed whitespace-pre-line">{mission.intro}</p>
              </div>
              <div className="bg-card border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground font-display tracking-wider mb-1">FAIT HISTORIQUE</p>
                  <p className="text-sm text-foreground">{mission.historical_fact}</p>
                </div>
              </div>
              <Button onClick={() => setPhase("enigme")} className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90">
                COMMENCER LES ÉNIGMES
              </Button>
            </motion.div>
          )}

          {/* ENIGME */}
          {phase === "enigme" && mission && (
            <motion.div
              key={`enigme-${currentEnigme}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-display text-primary tracking-wider px-2 py-1 bg-primary/10 rounded">
                  {mission.enigmes[currentEnigme].type.toUpperCase()}
                </span>
                <span className="text-xs text-muted-foreground">
                  Score: {score}/{currentEnigme + (answerRevealed ? 1 : 0)} · Erreurs: {errors}
                </span>
              </div>

              <h2 className="text-xl font-display font-bold text-foreground">
                {mission.enigmes[currentEnigme].question}
              </h2>

              <div className="space-y-3">
                {mission.enigmes[currentEnigme].choices.map((choice, i) => {
                  const isCorrect = choice === mission.enigmes[currentEnigme].answer;
                  const isSelected = choice === selectedAnswer;
                  let borderClass = "border-border hover:border-primary/50";
                  if (answerRevealed) {
                    if (isCorrect) borderClass = "border-primary bg-primary/10";
                    else if (isSelected && !isCorrect) borderClass = "border-destructive bg-destructive/10";
                    else borderClass = "border-border opacity-50";
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(choice)}
                      disabled={answerRevealed}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${borderClass} bg-card`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-foreground">{choice}</span>
                        {answerRevealed && isCorrect && <CheckCircle className="h-5 w-5 text-primary" />}
                        {answerRevealed && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {answerRevealed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {/* False hint */}
                  {currentEnigme === 1 && (
                    <div className="bg-card border border-classified/30 rounded-lg p-4 flex items-start gap-3 mb-4">
                      <AlertTriangle className="h-5 w-5 text-classified mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-classified font-display tracking-wider mb-1">INDICE INTERCEPTÉ</p>
                        <p className="text-sm text-muted-foreground italic">{mission.false_hint}</p>
                      </div>
                    </div>
                  )}
                  <Button onClick={nextStep} className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90">
                    {currentEnigme < mission.enigmes.length - 1 ? "ÉNIGME SUIVANTE" : "CHOIX MORAL"}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* MORAL CHOICE */}
          {phase === "moral" && mission && (
            <motion.div
              key="moral"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-display font-bold text-primary text-glow tracking-wider">
                DILEMME MORAL
              </h2>
              <p className="text-foreground leading-relaxed">{mission.moral_choice.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleMoralChoice("a")}
                  className="bg-card border border-border rounded-lg p-6 text-left hover:border-primary/50 transition-all hover:border-glow"
                >
                  <p className="text-xs font-display text-primary tracking-wider mb-2">OPTION A</p>
                  <p className="text-foreground">{mission.moral_choice.option_a}</p>
                </button>
                <button
                  onClick={() => handleMoralChoice("b")}
                  className="bg-card border border-border rounded-lg p-6 text-left hover:border-primary/50 transition-all hover:border-glow"
                >
                  <p className="text-xs font-display text-primary tracking-wider mb-2">OPTION B</p>
                  <p className="text-foreground">{mission.moral_choice.option_b}</p>
                </button>
              </div>
            </motion.div>
          )}

          {/* FINALE */}
          {phase === "finale" && mission && (
            <motion.div
              key="finale"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-display font-bold text-primary text-glow tracking-wider">
                FRAGMENT DÉBLOQUÉ
              </h2>
              <div className="bg-card border border-primary/30 rounded-lg p-6 border-glow">
                <p className="text-foreground leading-relaxed italic">{mission.final_fragment}</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 text-center">
                <p className="text-4xl font-display font-bold text-primary mb-2">{score}/{mission.enigmes.length}</p>
                <p className="text-muted-foreground text-sm">Énigmes résolues</p>
              </div>

              <Button onClick={completeMission} className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg">
                COMPLÉTER LA MISSION
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Mission;
