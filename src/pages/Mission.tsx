import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, BookOpen, Home,
  Heart, Clock, Zap, Shield, Trophy, RotateCcw
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { checkAndAwardBadges } from "@/lib/badges";

interface Enigme {
  question: string;
  type: string;
  choices: string[];
  answer: string;
  explanation?: string;
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

type Phase = "loading" | "intro" | "enigme" | "moral" | "finale" | "failed";

const DEMO_USER_ID = "demo-user-local";
const PUZZLE_TIMER_SECONDS = 120;
const MAX_ATTEMPTS_PER_PUZZLE = 2;

const LIVES_HEART_COLORS = ["text-destructive", "text-destructive", "text-destructive"];

function getDemoStoryState() {
  try {
    const raw = localStorage.getItem("wep_demo_story");
    return raw ? JSON.parse(raw) : { trust_level: 50, suspicion_level: 0, secrets_unlocked: 0 };
  } catch { return { trust_level: 50, suspicion_level: 0, secrets_unlocked: 0 }; }
}

function saveDemoStoryState(state: { trust_level: number; suspicion_level: number }) {
  localStorage.setItem("wep_demo_story", JSON.stringify(state));
}

const Mission = () => {
  const { countryId } = useParams<{ countryId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isDemo = !user;

  const [country, setCountry] = useState<Tables<"countries"> | null>(null);
  const [mission, setMission] = useState<MissionData | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [currentEnigme, setCurrentEnigme] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [attemptsOnCurrent, setAttemptsOnCurrent] = useState(0);

  // Lives system
  const [storyState, setStoryState] = useState({ trust_level: 50, suspicion_level: 0, secrets_unlocked: 0 });
  const [maxLives, setMaxLives] = useState(3);
  const [lives, setLives] = useState(3);

  // Timer (per puzzle)
  const [timeLeft, setTimeLeft] = useState(PUZZLE_TIMER_SECONDS);
  const [missionStartTime] = useState(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bonus time & life trade
  const [bonusSeconds, setBonusSeconds] = useState(0);
  const [lifeTradeUsed, setLifeTradeUsed] = useState(false);

  // Tracking
  const [usedHint, setUsedHint] = useState(false);
  const [ignoredFakeClue, setIgnoredFakeClue] = useState(true);

  // Compute effective timer based on suspicion
  const effectiveTimer = storyState.suspicion_level > 30
    ? Math.round(PUZZLE_TIMER_SECONDS * 0.85)
    : PUZZLE_TIMER_SECONDS;

  useEffect(() => {
    if (!countryId) return;
    loadMission();
  }, [countryId]);

  const loadMission = async () => {
    const { data: countryData } = await supabase
      .from("countries")
      .select("*")
      .eq("id", countryId!)
      .single();

    if (!countryData) { navigate("/dashboard"); return; }
    setCountry(countryData);

    let story = { trust_level: 50, suspicion_level: 0, secrets_unlocked: 0 };

    if (user) {
      const { data: stateData } = await supabase
        .from("user_story_state")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (stateData) story = { trust_level: stateData.trust_level, suspicion_level: stateData.suspicion_level, secrets_unlocked: stateData.secrets_unlocked };
    } else {
      story = getDemoStoryState();
    }
    setStoryState(story);

    // Compute lives based on suspicion
    const lives = story.suspicion_level > 70 ? 2 : 3;
    setMaxLives(lives);
    setLives(lives);

    const profileData = user
      ? (await supabase.from("profiles").select("level").eq("user_id", user.id).single()).data
      : null;

    try {
      const { data, error } = await supabase.functions.invoke("generate-mission", {
        body: {
          country: countryData,
          player_level: profileData?.level || 1,
          base_url: window.location.origin,
          ...story,
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

  // Puzzle timer
  useEffect(() => {
    if (phase !== "enigme" || answerRevealed) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTimeLeft(effectiveTimer);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentEnigme, answerRevealed]);

  const handleTimeOut = useCallback(() => {
    if (!mission) return;
    const newLives = lives - 1;
    setLives(newLives);
    setAnswerRevealed(true);
    setSelectedAnswer("__timeout__");

    if (newLives <= 0) {
      setTimeout(() => setPhase("failed"), 1200);
    } else {
      toast({
        title: "⏱ Temps écoulé !",
        description: `Vous perdez une vie. Il vous reste ${newLives} vie${newLives > 1 ? "s" : ""}.`,
        variant: "destructive",
      });
    }
  }, [lives, mission]);

  const handleAnswer = (choice: string) => {
    if (answerRevealed || !mission) return;
    const correct = choice === mission.enigmes[currentEnigme].answer;

    setSelectedAnswer(choice);
    setAttemptsOnCurrent(prev => prev + 1);

    if (correct) {
      setScore(s => s + 1);
      setAnswerRevealed(true);
      if (timerRef.current) clearInterval(timerRef.current);
      // Accumulate bonus seconds from remaining timer
      setBonusSeconds(prev => prev + timeLeft);
    } else {
      const newAttempts = attemptsOnCurrent + 1;
      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        setAnswerRevealed(true);
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => setPhase("failed"), 1200);
        return;
      }

      if (newAttempts >= MAX_ATTEMPTS_PER_PUZZLE) {
        // Max attempts reached → force reveal
        setAnswerRevealed(true);
        if (timerRef.current) clearInterval(timerRef.current);
        toast({ title: "❌ Tentatives épuisées", description: "La bonne réponse est révélée.", variant: "destructive" });
      } else {
        // Allow retry
        setSelectedAnswer(null);
        toast({
          title: "❌ Mauvaise réponse",
          description: `Tentative ${newAttempts}/${MAX_ATTEMPTS_PER_PUZZLE} · ${newLives} vie${newLives > 1 ? "s" : ""} restante${newLives > 1 ? "s" : ""}`,
          variant: "destructive",
        });
      }
    }
  };

  const nextStep = () => {
    if (!mission) return;
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setAttemptsOnCurrent(0);

    if (currentEnigme < mission.enigmes.length - 1) {
      setCurrentEnigme(c => c + 1);
    } else {
      setPhase("moral");
    }
  };

  const handleMoralChoice = async (option: "a" | "b") => {
    if (!mission) return;
    const impact = option === "a" ? mission.moral_choice.impact_a : mission.moral_choice.impact_b;

    if (user) {
      const { data: existing } = await supabase
        .from("user_story_state")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const newTrust = Math.max(0, Math.min(100, (existing?.trust_level ?? 50) + (impact.trust || 0)));
      const newSuspicion = Math.max(0, Math.min(100, (existing?.suspicion_level ?? 0) + (impact.suspicion || 0)));

      if (existing) {
        await supabase.from("user_story_state").update({ trust_level: newTrust, suspicion_level: newSuspicion }).eq("user_id", user.id);
      } else {
        await supabase.from("user_story_state").insert({ user_id: user.id, trust_level: newTrust, suspicion_level: newSuspicion });
      }
      setStoryState(s => ({ ...s, trust_level: newTrust, suspicion_level: newSuspicion }));
    } else {
      const newState = {
        trust_level: Math.max(0, Math.min(100, storyState.trust_level + (impact.trust || 0))),
        suspicion_level: Math.max(0, Math.min(100, storyState.suspicion_level + (impact.suspicion || 0))),
      };
      saveDemoStoryState(newState);
      setStoryState(s => ({ ...s, ...newState }));
    }

    setPhase("finale");
  };

  const completeMission = async () => {
    if (!countryId || !mission) return;

    const timeElapsed = Math.round((Date.now() - missionStartTime) / 1000);
    const total = mission.enigmes.length;

    // ─── 80% SUCCESS RULE ────────────────────────────────────────────────
    // Max 20% failure allowed: need at least ceil(total * 0.8) correct
    const requiredScore = Math.ceil(total * 0.8);
    const missionSuccess = score >= requiredScore;

    if (!missionSuccess) {
      // Update user_progress (increment attempts, no fragment)
      if (user) {
        await (supabase as any).from("user_progress").upsert({
          user_id: user.id,
          country_id: countryId,
          attempts: 1,
          best_score: score,
          success: false,
          fragment_unlocked: false,
          last_attempt_at: new Date().toISOString(),
        }, { onConflict: "user_id,country_id", ignoreDuplicates: false });
      }
      setPhase("failed");
      return;
    }

    // Compute XP (only on success)
    const timeBonus = Math.max(0, 30 - Math.floor(timeElapsed / 10)) * 2;
    const perfectBonus = score === total ? 50 : 0;
    const xpGained = 50 + score * 25 + timeBonus + perfectBonus;

    if (!user) {
      // Demo mode: save to localStorage
      const prev = JSON.parse(localStorage.getItem("wep_demo_progress") || "{}");
      prev[countryId] = { score, total, xp: xpGained, time: timeElapsed };
      localStorage.setItem("wep_demo_progress", JSON.stringify(prev));
      toast({ title: "Mission accomplie! (Mode Démo)", description: `+${xpGained} XP — Créez un compte pour sauvegarder.` });
      navigate(`/mission/${countryId}/complete?score=${score}&total=${total}&xp=${xpGained}&demo=1`);
      return;
    }

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

    // Create puzzle piece + update user_progress
    await Promise.all([
      supabase.from("puzzle_pieces").insert({
        user_id: user.id,
        country_id: countryId,
        unlocked: true,
        unlocked_at: new Date().toISOString(),
      }),
      (supabase as any).from("user_progress").upsert({
        user_id: user.id,
        country_id: countryId,
        attempts: 1,
        best_score: score,
        success: true,
        fragment_unlocked: true,
        last_attempt_at: new Date().toISOString(),
      }, { onConflict: "user_id,country_id", ignoreDuplicates: false }),
    ]);

    // Update XP + streak
    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("xp, level, streak, longest_streak")
      .eq("user_id", user.id)
      .single();
    const profile = profileRaw as any;

    let newStreak = (profile?.streak ?? 0) + 1;
    let longestStreak = Math.max(profile?.longest_streak ?? 0, newStreak);
    const newXp = (profile?.xp ?? 0) + xpGained;
    const streakMultiplier = Math.min(1.5, 1 + newStreak * 0.1);
    const finalXp = Math.round(newXp * (newStreak >= 2 ? streakMultiplier : 1));
    const newLevel = Math.floor(finalXp / 200) + 1;

    await (supabase.from("profiles") as any).update({
      xp: finalXp,
      level: newLevel,
      streak: newStreak,
      longest_streak: longestStreak,
      last_mission_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    const { count: missionCount } = await supabase
      .from("missions")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .eq("completed", true);

    const { data: completedPieces } = await supabase
      .from("puzzle_pieces")
      .select("country_id")
      .eq("user_id", user.id)
      .eq("unlocked", true);
    const completedCountries = new Set(completedPieces?.map(p => p.country_id) || []).size;

    checkAndAwardBadges({
      userId: user.id,
      score,
      total,
      timeElapsed,
      usedHint,
      ignoredFakeClue,
      missionCount: missionCount ?? 1,
      streak: newStreak,
      trustLevel: storyState.trust_level,
      suspicionLevel: storyState.suspicion_level,
      completedCountries,
      xp: finalXp,
    });

    toast({ title: "Mission accomplie!", description: `+${xpGained} XP · Score: ${score}/${total}` });
    navigate(`/mission/${countryId}/complete?score=${score}&total=${total}&xp=${xpGained}&streak=${newStreak}`);
  };

  const retryMission = () => {
    setPhase("loading");
    setScore(0);
    setCurrentEnigme(0);
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setAttemptsOnCurrent(0);
    setIgnoredFakeClue(true);
    setUsedHint(false);
    setBonusSeconds(0);
    setLifeTradeUsed(false);
    const lives = storyState.suspicion_level > 70 ? 2 : 3;
    setLives(lives);
    setMaxLives(lives);
    loadMission();
  };

  // ─── LOADING ────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-primary font-display tracking-widest animate-pulse-gold">GÉNÉRATION DE LA MISSION...</p>
          <p className="text-muted-foreground text-sm mt-2">L'IA prépare votre briefing</p>
        </motion.div>
      </div>
    );
  }

  const timerPercent = (timeLeft / effectiveTimer) * 100;
  const timerColor = timerPercent > 50 ? "bg-primary" : timerPercent > 25 ? "bg-yellow-500" : "bg-destructive";

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Top bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Home className="h-4 w-4" />
              <span className="text-xs font-display tracking-wider hidden sm:inline">ACCUEIL</span>
            </Link>
            <span className="text-border">|</span>
            <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-display hidden sm:inline">RETOUR</span>
            </button>
          </div>

          {/* Country name */}
          <div className="text-sm font-display text-primary tracking-wider flex-1 text-center truncate">
            {country?.name?.toUpperCase()}
          </div>

          {/* Lives + enigme counter */}
          <div className="flex items-center gap-3">
            {/* Lives */}
            {(phase === "enigme" || phase === "moral" || phase === "finale") && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: maxLives }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`h-4 w-4 transition-all ${i < lives ? "text-destructive fill-destructive" : "text-border"}`}
                  />
                ))}
              </div>
            )}
            {phase === "enigme" && mission && (
              <span className="text-sm text-muted-foreground font-display">
                {currentEnigme + 1}/{mission.enigmes.length}
              </span>
            )}
          </div>
        </div>

        {/* Bonus bar — visible during enigme phase */}
        {(phase === "enigme" || phase === "moral" || phase === "finale") && bonusSeconds > 0 && (
          <div className="border-t px-4 py-1.5" style={{ borderColor: "hsl(var(--gold-glow) / 0.25)" }}>
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <span className="text-xs font-display tracking-wider flex-shrink-0" style={{ color: "hsl(var(--gold-glow))" }}>⚡ BONUS</span>
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, (bonusSeconds / 120) * 100)}%`, backgroundColor: "hsl(var(--gold-glow))" }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="text-xs font-display flex-shrink-0 tabular-nums" style={{ color: "hsl(var(--gold-glow))" }}>{bonusSeconds}s</span>
            </div>
          </div>
        )}

        {/* Suspicion warning banner */}
        {storyState.suspicion_level > 30 && phase === "enigme" && (
          <div className="bg-destructive/10 border-t border-destructive/30 px-4 py-1.5 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive font-display tracking-wider">
              {storyState.suspicion_level > 70
                ? "⚠ SUSPICION CRITIQUE — 2 vies · Chrono réduit"
                : "⚠ SUSPICION ÉLEVÉE — Chrono réduit de 15%"}
            </p>
          </div>
        )}

        {/* High trust hint banner */}
        {storyState.trust_level > 70 && phase === "enigme" && !usedHint && (
          <div className="bg-primary/10 border-t border-primary/20 px-4 py-1.5 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <p className="text-xs text-primary font-display tracking-wider">
              CONFIANCE ÉLEVÉE — 1 indice gratuit disponible
            </p>
            <button
              onClick={() => {
                setUsedHint(true);
                if (mission) {
                  toast({ title: "💡 Indice", description: `Bonne réponse : ${mission.enigmes[currentEnigme].answer}` });
                }
              }}
              className="ml-auto text-xs text-primary underline font-display"
            >
              UTILISER
            </button>
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Demo mode CTA */}
        {isDemo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-card border border-dashed border-primary/40 rounded-lg px-5 py-3 flex items-center justify-between gap-3"
          >
            <p className="text-xs text-muted-foreground font-display tracking-wider">
              MODE DÉMO — Progression non sauvegardée
            </p>
            <Link to="/auth">
              <Button size="sm" variant="outline" className="text-xs font-display tracking-wider border-primary/50 text-primary hover:bg-primary/10">
                CRÉER UN COMPTE
              </Button>
            </Link>
          </motion.div>
        )}

        <AnimatePresence mode="wait">

          {/* ── INTRO ─────────────────────────────── */}
          {phase === "intro" && mission && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <h1 className="text-3xl font-display font-bold text-primary text-glow tracking-wider">{mission.mission_title}</h1>

              {/* Mission rules card */}
              <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="flex justify-center gap-0.5 mb-1">
                    {Array.from({ length: maxLives }).map((_, i) => <Heart key={i} className="h-4 w-4 text-destructive fill-destructive" />)}
                  </div>
                  <p className="text-xs text-muted-foreground font-display tracking-wider">{maxLives} VIE{maxLives > 1 ? "S" : ""}</p>
                </div>
                <div>
                  <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground font-display tracking-wider">{effectiveTimer}S / ÉNIGME</p>
                </div>
                <div>
                  <Shield className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground font-display tracking-wider">2 TENTATIVES MAX</p>
                </div>
              </div>

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

          {/* ── ENIGME ────────────────────────────── */}
          {phase === "enigme" && mission && (
            <motion.div key={`enigme-${currentEnigme}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-5">

              {/* Timer bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-display">
                  <span className="text-muted-foreground tracking-wider">{mission.enigmes[currentEnigme].type.toUpperCase()}</span>
                  <span className={`flex items-center gap-1 ${timeLeft <= 15 ? "text-destructive animate-pulse" : "text-muted-foreground"}`}>
                    <Clock className="h-3.5 w-3.5" />
                    {timeLeft}s
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full transition-colors ${timerColor}`}
                    style={{ width: `${timerPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Enigme progress dots */}
              <div className="flex gap-1.5 justify-center">
                {mission.enigmes.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i < currentEnigme ? "w-6 bg-primary" : i === currentEnigme ? "w-6 bg-primary/70" : "w-4 bg-border"}`} />
                ))}
              </div>

              <h2 className="text-xl font-display font-bold text-foreground">{mission.enigmes[currentEnigme].question}</h2>

              <div className="space-y-3">
                {mission.enigmes[currentEnigme].choices.map((choice, i) => {
                  const isCorrect = choice === mission.enigmes[currentEnigme].answer;
                  const isSelected = choice === selectedAnswer;
                  let cls = "border-border hover:border-primary/50 cursor-pointer";
                  if (answerRevealed) {
                    if (isCorrect) cls = "border-primary bg-primary/10 cursor-default";
                    else if (isSelected && !isCorrect) cls = "border-destructive bg-destructive/10 cursor-default";
                    else cls = "border-border opacity-40 cursor-default";
                  } else if (isSelected) {
                    cls = "border-primary/50 bg-primary/5";
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(choice)}
                      disabled={answerRevealed}
                      className={`w-full text-left p-4 rounded-lg border transition-all bg-card ${cls}`}
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

              {/* Attempts indicator */}
              {!answerRevealed && attemptsOnCurrent > 0 && (
                <p className="text-xs text-destructive font-display tracking-wider text-center">
                  Tentative {attemptsOnCurrent}/{MAX_ATTEMPTS_PER_PUZZLE}
                </p>
              )}

              {answerRevealed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

                  {/* Explanation — shown for static content countries */}
                  {mission.enigmes[currentEnigme].explanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-card border border-primary/20 rounded-lg p-4 flex items-start gap-3"
                    >
                      <BookOpen className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-primary font-display tracking-wider mb-1.5">ANALYSE HISTORIQUE</p>
                        <p className="text-sm text-foreground leading-relaxed">{mission.enigmes[currentEnigme].explanation}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* False hint after enigme 2 */}
                  {currentEnigme === 1 && (
                    <div
                      className="bg-card border border-classified/30 rounded-lg p-4 flex items-start gap-3 cursor-pointer hover:border-classified/60 transition-all"
                      onClick={() => {
                        setIgnoredFakeClue(false);
                        toast({ title: "🚨 Faux indice détecté", description: "Ce message est une désinformation. Ne vous laissez pas piéger !", variant: "destructive" });
                      }}
                    >
                      <AlertTriangle className="h-5 w-5 text-classified mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-classified font-display tracking-wider mb-1">INDICE INTERCEPTÉ</p>
                        <p className="text-sm text-muted-foreground italic">{mission.false_hint}</p>
                        <p className="text-xs text-muted-foreground mt-2 font-display">(cliquez pour analyser)</p>
                      </div>
                    </div>
                  )}

                  {/* Life trade button — 3 conditions */}
                  {mission && lives === 1 && currentEnigme >= Math.floor(mission.enigmes.length / 2) && bonusSeconds >= 60 && !lifeTradeUsed && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <button
                        onClick={() => {
                          setLives(prev => prev + 1);
                          setBonusSeconds(prev => prev - 60);
                          setLifeTradeUsed(true);
                          toast({ title: "💛 Vie récupérée !", description: "Votre rapidité vous a sauvé — 60s de bonus déduits." });
                        }}
                        className="w-full py-2.5 px-4 rounded-lg border font-display tracking-wider text-sm flex items-center justify-center gap-2 transition-all"
                        style={{
                          borderColor: "hsl(var(--gold-glow) / 0.5)",
                          color: "hsl(var(--gold-glow))",
                          backgroundColor: "hsl(var(--gold-glow) / 0.08)",
                        }}
                      >
                        <Heart className="h-4 w-4" />
                        ÉCHANGER 60s BONUS → +1 VIE
                      </button>
                    </motion.div>
                  )}

                  <Button onClick={nextStep} className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90">
                    {currentEnigme < mission.enigmes.length - 1 ? "ÉNIGME SUIVANTE →" : "CHOIX MORAL"}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── FAILED ────────────────────────────── */}
          {phase === "failed" && mission && (
            <motion.div key="failed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
                <XCircle className="h-20 w-20 text-destructive mx-auto" />
              </motion.div>
              <div>
                <h2 className="text-3xl font-display font-bold text-destructive tracking-wider mb-2">MISSION ÉCHOUÉE</h2>
                <p className="text-muted-foreground">Vous avez perdu toutes vos vies. La mission a été compromise.</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-4xl font-display font-bold text-foreground mb-1">{score}/{mission.enigmes.length}</p>
                <p className="text-sm text-muted-foreground font-display tracking-wider">ÉNIGMES RÉSOLUES AVANT L'ÉCHEC</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={retryMission} className="flex-1 font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 py-5">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  RÉESSAYER
                </Button>
                <Button variant="outline" onClick={() => navigate("/dashboard")} className="flex-1 font-display tracking-wider py-5">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  RETOUR AU QG
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── MORAL CHOICE ──────────────────────── */}
          {phase === "moral" && mission && (
            <motion.div key="moral" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <h2 className="text-2xl font-display font-bold text-primary text-glow tracking-wider">DILEMME MORAL</h2>
              <p className="text-foreground leading-relaxed">{mission.moral_choice.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => handleMoralChoice("a")} className="bg-card border border-border rounded-lg p-6 text-left hover:border-primary/50 transition-all hover:border-glow">
                  <p className="text-xs font-display text-primary tracking-wider mb-2">OPTION A</p>
                  <p className="text-foreground">{mission.moral_choice.option_a}</p>
                </button>
                <button onClick={() => handleMoralChoice("b")} className="bg-card border border-border rounded-lg p-6 text-left hover:border-primary/50 transition-all hover:border-glow">
                  <p className="text-xs font-display text-primary tracking-wider mb-2">OPTION B</p>
                  <p className="text-foreground">{mission.moral_choice.option_b}</p>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── FINALE ────────────────────────────── */}
          {phase === "finale" && mission && (
            <motion.div key="finale" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <h2 className="text-2xl font-display font-bold text-primary text-glow tracking-wider">FRAGMENT DÉBLOQUÉ</h2>
              <div className="bg-card border border-primary/30 rounded-lg p-6 border-glow">
                <p className="text-foreground leading-relaxed italic">{mission.final_fragment}</p>
              </div>

              {/* XP Preview */}
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-4xl font-display font-bold text-primary">{score}/{mission.enigmes.length}</p>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-display tracking-wider mb-0.5">XP ESTIMÉ</p>
                    <p className="text-lg font-display font-bold text-primary">
                      +{50 + score * 25 + Math.max(0, 30 - Math.floor((Date.now() - missionStartTime) / 10000)) * 2 + (score === mission.enigmes.length ? 50 : 0)}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">Énigmes résolues</p>
                {score === mission.enigmes.length && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-primary font-display tracking-wider">
                    <Trophy className="h-4 w-4" />
                    MISSION PARFAITE +50 XP BONUS
                  </div>
                )}
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
