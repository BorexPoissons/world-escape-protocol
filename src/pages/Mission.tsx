import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, BookOpen, Home,
  Heart, Clock, Zap, Shield, Trophy, RotateCcw, Puzzle
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { checkAndAwardBadges } from "@/lib/badges";

interface Enigme {
  question: string;
  type: string;       // legacy: "culture" | "logique" | etc.
  question_type?: "A" | "B" | "C";  // structured type
  choices: string[];
  answer: string;     // always the full text of the correct answer
  explanation?: string;
  narrative_unlock?: string; // only on Type C
}

interface MoralChoice {
  description: string;
  option_a: string;
  option_b: string;
  impact_a: { trust: number; suspicion: number };
  impact_b: { trust: number; suspicion: number };
}

interface MissionConfig {
  total_questions: number;      // questions drawn per run
  min_correct_to_win: number;   // correct answers needed to win
  lives: number;                // lives at start
  time_per_question_sec: number; // timer per question
}

interface MissionData {
  mission_title: string;
  intro: string;
  enigmes: Enigme[];
  false_hint?: string;
  moral_choice?: MoralChoice;
  final_fragment?: string;
  historical_fact?: string;
}

interface FragmentReward {
  id: string;
  name: string;
  concept: string;
  unlocked_message: string;
}

type Phase = "loading" | "intro" | "enigme" | "narrative_unlock" | "moral" | "finale" | "failed" | "rescue_offer";

const DEMO_USER_ID = "demo-user-local";

// ── OFFICIAL QUIZ SPEC ─────────────────────────────────────────────────────
// 6 questions per run · 5 correct to win · 2 lives · 120s per question
// Bonus pool: remaining seconds accumulate; if lives==0 and pool>=120 → restore 1 life
const DEFAULT_MISSION_CONFIG: MissionConfig = {
  total_questions: 6,
  min_correct_to_win: 5,
  lives: 2,
  time_per_question_sec: 120,
};

const LIVES_HEART_COLORS = ["text-destructive", "text-destructive", "text-destructive"];

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  const [totalMistakes, setTotalMistakes] = useState(0); // across the whole mission
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [attemptsOnCurrent, setAttemptsOnCurrent] = useState(0);
  const [firstMistakeWarning, setFirstMistakeWarning] = useState(false); // show "1 erreur" warning

  // ── Mission config (source of truth, read from JSON quiz_rules) ─────────
  const [missionConfig, setMissionConfig] = useState<MissionConfig>(DEFAULT_MISSION_CONFIG);

  // Derived shorthand (live values from config)
  const TOTAL_QUESTIONS = missionConfig.total_questions;
  const SCORE_THRESHOLD = missionConfig.min_correct_to_win;
  const PUZZLE_TIMER_SECONDS = missionConfig.time_per_question_sec;
  // MAX_LIVES = total lives at start (for heart display)
  const MAX_LIVES = missionConfig.lives;

  // Lives system
  const [storyState, setStoryState] = useState({ trust_level: 50, suspicion_level: 0, secrets_unlocked: 0 });
  const [maxLives, setMaxLives] = useState(DEFAULT_MISSION_CONFIG.lives);
  const [lives, setLives] = useState(DEFAULT_MISSION_CONFIG.lives);

  // Timer (per puzzle)
  const [timeLeft, setTimeLeft] = useState(DEFAULT_MISSION_CONFIG.time_per_question_sec);
  const [missionStartTime] = useState(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bonus time pool — accumulates remaining seconds from correct answers
  // When lives==0 and bonusPool>=120 → restore 1 life, deduct 120s
  const [bonusPool, setBonusPool] = useState(0);

  // Tracking
  const [usedHint, setUsedHint] = useState(false);
  const [ignoredFakeClue, setIgnoredFakeClue] = useState(true);

  // Static mission state (A/B/C system)
  const [isStaticMission, setIsStaticMission] = useState(false);
  const [fragmentReward, setFragmentReward] = useState<FragmentReward | null>(null);
  const [narrativeUnlockText, setNarrativeUnlockText] = useState<string | null>(null);

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

    // Lives from official spec (2). Suspicion only affects the timer, not lives.
    const initialLives = DEFAULT_MISSION_CONFIG.lives;
    setMaxLives(initialLives);
    setLives(initialLives);

    const profileData = user
      ? (await supabase.from("profiles").select("level").eq("user_id", user.id).single()).data
      : null;

    // ── 0. PRIORITY: Try to load static JSON from /public/content/countries/ ──
    try {
      const res = await fetch(`/content/countries/${countryData.code}.json`);
      if (res.ok) {
        const staticData = await res.json();
        // Detect new A/B/C format
        if (staticData.question_bank && Array.isArray(staticData.question_bank)) {
          const bank = staticData.question_bank as Array<{
            id: string; type: "A" | "B" | "C"; question: string;
            choices: string[]; answer_index: number; narrative_unlock?: string;
          }>;
          const qr = staticData.quiz_rules ?? {};
          const dist = qr.distribution ?? { A: 4, B: 1, C: 1 };

          // Draw: 4xA + 1xB + 1xC (Type C mandatory)
          const typeA = shuffle(bank.filter(q => q.type === "A")).slice(0, dist.A ?? 4);
          const typeB = shuffle(bank.filter(q => q.type === "B")).slice(0, dist.B ?? 1);
          const typeC = shuffle(bank.filter(q => q.type === "C")).slice(0, dist.C ?? 1);
          const picked = shuffle([...typeA, ...typeB, ...typeC]);

          // ── Build missionConfig from official spec (source of truth) ─────────
          // Spec: 6 questions/run · 5 correct to win · 2 lives · 120s/question
          const totalQ = picked.length; // actual questions drawn this session
          const cfg: MissionConfig = {
            total_questions: totalQ,
            min_correct_to_win: qr.min_correct_to_win ?? DEFAULT_MISSION_CONFIG.min_correct_to_win,
            lives: qr.lives ?? (qr.max_mistakes != null ? qr.max_mistakes + 1 : DEFAULT_MISSION_CONFIG.lives),
            time_per_question_sec: qr.time_per_question_sec ?? DEFAULT_MISSION_CONFIG.time_per_question_sec,
          };
          setMissionConfig(cfg);
          setMaxLives(cfg.lives);
          setLives(cfg.lives);
          setTimeLeft(cfg.time_per_question_sec);

          // Convert to Enigme — shuffle choices but preserve correct answer as text
          const enigmes: Enigme[] = picked.map(q => {
            const correctText = q.choices[q.answer_index];
            const shuffledChoices = shuffle([...q.choices]);
            return {
              question: q.question,
              type: q.type,
              question_type: q.type,
              choices: shuffledChoices,
              answer: correctText,
              narrative_unlock: q.narrative_unlock,
            };
          });

          const missionData: MissionData = {
            mission_title: staticData.mission?.mission_title ?? `Mission : ${countryData.name}`,
            intro: staticData.mission?.intro ?? "",
            enigmes,
          };

          const reward: FragmentReward = staticData.fragment_reward ?? {
            id: `FRAG-${countryData.code}-001`,
            name: `Fragment de ${countryData.name}`,
            concept: "FRAGMENT",
            unlocked_message: "Un nouveau nœud s'est activé sur la carte mondiale.",
          };

          setMission(missionData);
          setFragmentReward(reward);
          setIsStaticMission(true);
          setPhase("intro");
          return;
        }
      }
    } catch {
      // Static file not found or parse error — fall through to DB/AI
    }


    // ── 1. Try to load questions from DB ─────────────────────────────────────
    const { data: dbQuestions } = await supabase
      .from("questions")
      .select("*")
      .eq("country_id", countryId!);

    if (dbQuestions && dbQuestions.length >= 4) {
      const shuffled = shuffle(dbQuestions);
      const picked = shuffled.slice(0, Math.min(6, shuffled.length));

      const enigmes: Enigme[] = picked.map((q: any) => ({
        question: q.question_text,
        type: q.category || "culture",
        choices: shuffle(Array.isArray(q.answer_options) ? q.answer_options : JSON.parse(q.answer_options || "[]")),
        answer: q.correct_answer,
        explanation: q.explanation ?? undefined,
      }));

      const missionData: MissionData = {
        mission_title: `Mission : ${countryData.name}`,
        intro: countryData.description || `Bienvenue à ${countryData.name}. Résolvez les énigmes pour débloquer le fragment.`,
        enigmes,
        false_hint: "Certains indices peuvent être trompeurs. Faites confiance à votre analyse.",
        moral_choice: {
          description: "Votre choix va influencer le cours de l'enquête.",
          option_a: "Partager les informations avec votre réseau de confiance",
          option_b: "Agir seul pour éviter toute fuite",
          impact_a: { trust: 5, suspicion: -2 },
          impact_b: { trust: -3, suspicion: 5 },
        },
        final_fragment: `Fragment de ${countryData.name} obtenu. Le réseau se révèle un peu plus.`,
        historical_fact: countryData.historical_events?.[0] ?? `Le pays de ${countryData.name} recèle de nombreux secrets.`,
      };

      setMission(missionData);
      setPhase("intro");
      return;
    }

    // ── 2. Fallback: AI generation ────────────────────────────────────────────
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

      const aiMission = data as MissionData;
      aiMission.enigmes = aiMission.enigmes.map(e => ({
        ...e,
        choices: shuffle(e.choices),
      }));

      setMission(aiMission);
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
    const currentQ = mission.enigmes[currentEnigme];
    // Timeout on Type C = instant fail
    if (currentQ.question_type === "C") {
      setAnswerRevealed(true);
      setSelectedAnswer("__timeout__");
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => setPhase("failed"), 1400);
      return;
    }
    // Timeout costs 1 life
    const newLives = lives - 1;
    setLives(newLives);
    setTotalMistakes(prev => prev + 1);
    setAnswerRevealed(true);
    setSelectedAnswer("__timeout__");
    if (timerRef.current) clearInterval(timerRef.current);
    // ── Bonus rescue: if lives==0 and pool>=120, show manual rescue screen ──
    if (newLives <= 0) {
      if (bonusPool >= 120) {
        setTimeout(() => setPhase("rescue_offer"), 1400);
      } else {
        setTimeout(() => setPhase("failed"), 1400);
      }
    } else {
      setFirstMistakeWarning(newLives === 1);
      toast({
        title: "⏱ Temps écoulé !",
        description: newLives === 1
          ? "⚠ DERNIÈRE VIE — La prochaine erreur termine la mission."
          : `Il vous reste ${newLives} vie${newLives > 1 ? "s" : ""}.`,
        variant: "destructive",
      });
    }
  }, [lives, bonusPool, mission, currentEnigme]);

  const handleAnswer = (choice: string) => {
    if (answerRevealed || !mission) return;
    const currentQ = mission.enigmes[currentEnigme];
    const correct = choice === currentQ.answer;
    const isTypeC = currentQ.question_type === "C";

    setSelectedAnswer(choice);
    setAttemptsOnCurrent(prev => prev + 1);

    if (correct) {
      const newScore = score + 1;
      setScore(newScore);
      setAnswerRevealed(true);
      setFirstMistakeWarning(false);
      if (timerRef.current) clearInterval(timerRef.current);
      // ── Accumulate remaining time in bonus pool ──────────────────────────
      setBonusPool(prev => prev + timeLeft);
      // Type C correct → set narrative unlock to display after "Suivant"
      if (isTypeC && currentQ.narrative_unlock) {
        setNarrativeUnlockText(currentQ.narrative_unlock);
      }
      // ── Immediate win check ──────────────────────────────────────────────
      if (newScore >= SCORE_THRESHOLD) {
        setTimeout(() => setPhase("finale"), 900);
        return;
      }
    } else {
      // Type C wrong → instant fail
      if (isTypeC) {
        setAnswerRevealed(true);
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => setPhase("failed"), 1400);
        return;
      }
      // Wrong answer costs 1 life
      const newLives = lives - 1;
      setTotalMistakes(prev => prev + 1);
      setLives(newLives);
      setAnswerRevealed(true);
      if (timerRef.current) clearInterval(timerRef.current);
      // ── Bonus rescue: if lives==0 and pool>=120, show manual rescue screen ──
      if (newLives <= 0) {
        if (bonusPool >= 120) {
          setTimeout(() => setPhase("rescue_offer"), 1400);
        } else {
          setTimeout(() => setPhase("failed"), 1400);
        }
      } else {
        setFirstMistakeWarning(newLives === 1);
        toast({
          title: "❌ Mauvaise réponse",
          description: newLives === 1
            ? "⚠ DERNIÈRE VIE — La prochaine erreur termine la mission."
            : `Il vous reste ${newLives} vie${newLives > 1 ? "s" : ""}.`,
          variant: "destructive",
        });
      }
    }
  };

  const handleRescue = () => {
    setBonusPool(prev => prev - 120);
    setLives(1);
    setAnswerRevealed(false);
    setSelectedAnswer(null);
    setAttemptsOnCurrent(0);
    if (currentEnigme < mission!.enigmes.length - 1) {
      setCurrentEnigme(c => c + 1);
    }
    setPhase("enigme");
    toast({ title: "⚡ Vie récupérée !", description: "120s de bonus utilisés. Mission continue." });
  };

  const nextStep = () => {
    if (!mission) return;
    // ── Guard: never advance if mission is not in active enigme phase ────────
    if (phase !== "enigme") return;

    // If narrative unlock pending, show overlay first
    if (narrativeUnlockText) {
      setPhase("narrative_unlock");
      return;
    }
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setAttemptsOnCurrent(0);
    if (currentEnigme < mission.enigmes.length - 1) {
      setCurrentEnigme(c => c + 1);
    } else {
      // All questions answered — check score threshold
      if (score >= SCORE_THRESHOLD) {
        setPhase(isStaticMission ? "finale" : "moral");
      } else {
        setPhase("failed");
      }
    }
  };

  const continueFromNarrativeUnlock = () => {
    setNarrativeUnlockText(null);
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setAttemptsOnCurrent(0);
    if (currentEnigme < mission!.enigmes.length - 1) {
      setCurrentEnigme(c => c + 1);
      setPhase("enigme");
    } else {
      // All questions done — enforce score threshold
      if (score >= SCORE_THRESHOLD) {
        setPhase(isStaticMission ? "finale" : "moral");
      } else {
        setPhase("failed");
      }
    }
  };

  const handleMoralChoice = async (option: "a" | "b") => {
    if (!mission || !mission.moral_choice) return;
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
    if (!countryId || !mission || !country) return;

    const timeElapsed = Math.round((Date.now() - missionStartTime) / 1000);
    const total = mission.enigmes.length;

    // ─── FRAGMENT THRESHOLD: uses SCORE_THRESHOLD from missionConfig (5/6) ───
    const fragmentEarned = score >= SCORE_THRESHOLD;

    // Demo mode — no DB
    if (!user) {
      const prev = JSON.parse(localStorage.getItem("wep_demo_progress") || "{}");
      prev[countryId] = { score, total, time: timeElapsed };
      localStorage.setItem("wep_demo_progress", JSON.stringify(prev));
      if (!fragmentEarned) {
        toast({
          title: `Score: ${score}/${total}`,
          description: `Il faut ${SCORE_THRESHOLD}/${TOTAL_QUESTIONS} pour obtenir la pièce. Rejouer ?`,
          variant: "destructive",
        });
        setPhase("failed");
        return;
      }
      const xp = 50 + score * 25;
      toast({ title: "Mission accomplie! (Mode Démo)", description: `+${xp} XP — Créez un compte pour sauvegarder.` });
      navigate(`/mission/${countryId}/complete?score=${score}&total=${total}&xp=${xp}&demo=1`);
      return;
    }

    // ─── ATOMIC SERVER CALL ─────────────────────────────────────────────
    // complete_country_attempt handles: progress upsert + fragment insert (ON CONFLICT DO NOTHING)
    const { data: rpcResult, error: rpcError } = await (supabase as any).rpc(
      "complete_country_attempt",
      {
        p_user_id: user.id,
        p_country_code: country.code,
        p_score: score,
        p_total: total,
      }
    );

    if (rpcError) {
      console.error("complete_country_attempt error:", rpcError);
      toast({ title: "Erreur de sauvegarde", description: rpcError.message, variant: "destructive" });
    }

    const result = rpcResult as {
      best_score: number;
      fragment_granted: boolean;
      fragment_new: boolean;
      unlocked_next: boolean;
    } | null;

    // Score < threshold → pas de fragment, mission échouée (peut rejouer)
    if (!fragmentEarned) {
      toast({
        title: `Score: ${score}/${total}`,
        description: `Il faut ${SCORE_THRESHOLD}/${TOTAL_QUESTIONS} minimum pour obtenir la pièce. Vous pouvez rejouer.`,
        variant: "destructive",
      });
      setPhase("failed");
      return;
    }

    // Score ≥ 8 → succès, XP, badges, redirection
    const timeBonus = Math.max(0, 30 - Math.floor(timeElapsed / 10)) * 2;
    const perfectBonus = score === total ? 50 : 0;
    const xpGained = 50 + score * 25 + timeBonus + perfectBonus;

    // Save mission record
    await supabase.from("missions").insert({
      user_id: user.id,
      country_id: countryId,
      mission_title: mission.mission_title,
      mission_data: mission as any,
      completed: true,
      score,
      completed_at: new Date().toISOString(),
    });

    // Update XP + streak
    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("xp, level, streak, longest_streak")
      .eq("user_id", user.id)
      .single();
    const prof = profileRaw as any;

    let newStreak = (prof?.streak ?? 0) + 1;
    let longestStreak = Math.max(prof?.longest_streak ?? 0, newStreak);
    const newXp = (prof?.xp ?? 0) + xpGained;
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
    const completedCountriesCount = new Set(completedPieces?.map((p: any) => p.country_id) || []).size;

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
      completedCountries: completedCountriesCount,
      xp: finalXp,
    });

    toast({ title: "Mission accomplie!", description: `+${xpGained} XP · Score: ${score}/${total}` });
    navigate(`/mission/${countryId}/complete?score=${score}&total=${total}&xp=${xpGained}&streak=${newStreak}`);
  };

  const retryMission = () => {
    setPhase("loading");
    setScore(0);
    setTotalMistakes(0);
    setFirstMistakeWarning(false);
    setCurrentEnigme(0);
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setAttemptsOnCurrent(0);
    setIgnoredFakeClue(true);
    setUsedHint(false);
    setBonusPool(0);
    setNarrativeUnlockText(null);
    setIsStaticMission(false);
    setFragmentReward(null);
    // Reset lives from config (2 per spec, unless suspicion overrides)
    const newLives = missionConfig.lives;
    setLives(newLives);
    setMaxLives(newLives);
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

          {/* Lives + question counter in top bar */}
          <div className="flex items-center gap-3">
            {/* Lives: heart icons — filled = alive, empty = lost */}
            {(phase === "enigme" || phase === "moral" || phase === "finale") && (
              <div className="flex items-center gap-1" title="Vies restantes">
                {Array.from({ length: MAX_LIVES }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={i === lives && totalMistakes > 0 ? { scale: [1.4, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Heart className={`h-4 w-4 transition-all ${
                      i < lives ? "text-destructive fill-destructive" : "text-border"
                    }`} />
                  </motion.div>
                ))}
              </div>
            )}
            {phase === "enigme" && mission && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground font-display">
                  {currentEnigme + 1}/{TOTAL_QUESTIONS}
                </span>
                <span className={`text-sm font-display font-bold tracking-wider transition-colors ${
                  score >= SCORE_THRESHOLD
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}>
                  ✓ {score}/{SCORE_THRESHOLD}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* First-mistake warning banner */}
        <AnimatePresence>
          {firstMistakeWarning && phase === "enigme" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-destructive/15 border-t border-destructive/40 px-4 py-2 flex items-center gap-2"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
              <p className="text-xs text-destructive font-display tracking-wider">
                ⚠ AVERTISSEMENT — La prochaine erreur entraîne l'échec de la mission
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bonus pool bar — always visible during enigme phase, shows accumulated bonus seconds */}
        {(phase === "enigme" || phase === "moral" || phase === "finale") && (
          <div className="border-t px-4 py-1.5" style={{ borderColor: "hsl(var(--gold-glow) / 0.25)" }}>
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <span className="text-xs font-display tracking-wider flex-shrink-0" style={{ color: "hsl(var(--gold-glow))" }}>⚡ BONUS</span>
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, (bonusPool / 120) * 100)}%`, backgroundColor: "hsl(var(--gold-glow))" }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="text-xs font-display flex-shrink-0 tabular-nums" style={{ color: bonusPool >= 120 ? "hsl(var(--gold-glow))" : "hsl(var(--muted-foreground))" }}>{bonusPool}s{bonusPool >= 120 ? " ✓" : "/120s"}</span>
            </div>
          </div>
        )}

        {/* Suspicion warning banner */}
        {storyState.suspicion_level > 30 && phase === "enigme" && (
          <div className="bg-destructive/10 border-t border-destructive/30 px-4 py-1.5 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive font-display tracking-wider">
              {storyState.suspicion_level > 70
                ? "⚠ SUSPICION CRITIQUE — Chrono réduit"
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
                  <Trophy className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground font-display tracking-wider">{SCORE_THRESHOLD}/{TOTAL_QUESTIONS} REQUIS</p>
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
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground tracking-wider">
                      {mission.enigmes[currentEnigme].question_type
                        ? `TYPE ${mission.enigmes[currentEnigme].question_type}`
                        : mission.enigmes[currentEnigme].type.toUpperCase()}
                    </span>
                    {mission.enigmes[currentEnigme].question_type === "C" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-display tracking-wider"
                        style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.4)" }}>
                        CRITIQUE
                      </span>
                    )}
                  </div>
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

              {/* Objective banner */}
              <motion.div
                className="flex items-center justify-center gap-2 py-1"
                animate={score >= SCORE_THRESHOLD ? { scale: [1, 1.04, 1] } : {}}
                transition={{ duration: 0.4 }}
              >
                <span className={`text-xs font-display tracking-widest transition-colors ${
                  score >= SCORE_THRESHOLD ? "text-primary" : "text-muted-foreground"
                }`}>
                  {score >= SCORE_THRESHOLD ? "✅" : "🎯"} OBJECTIF : {score} / {SCORE_THRESHOLD} BONNES RÉPONSES
                </span>
              </motion.div>

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
              {/* Lives + score display inline during question */}
              {!answerRevealed && (
                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: MAX_LIVES }).map((_, i) => (
                      <Heart key={i} className={`h-4 w-4 ${i < lives ? "text-destructive fill-destructive" : "text-border"}`} />
                    ))}
                    <span className="text-xs text-muted-foreground font-display ml-1">
                      {lives} VIE{lives > 1 ? "S" : ""}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-display font-bold tracking-wider transition-colors ${
                    score >= SCORE_THRESHOLD ? "text-primary" : "text-muted-foreground"
                  }`}>
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{score} bonne{score > 1 ? "s" : ""} — Objectif : {SCORE_THRESHOLD}/{TOTAL_QUESTIONS}</span>
                  </div>
                </div>
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

                  {/* Bonus rescue info — shows when pool is building toward 120s rescue */}
                  {bonusPool > 0 && lives <= 1 && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                      className="w-full py-2.5 px-4 rounded-lg border font-display tracking-wider text-sm flex items-center justify-center gap-2"
                      style={{
                        borderColor: bonusPool >= 120 ? "hsl(var(--gold-glow) / 0.5)" : "hsl(var(--gold-glow) / 0.25)",
                        color: bonusPool >= 120 ? "hsl(var(--gold-glow))" : "hsl(var(--muted-foreground))",
                        backgroundColor: "hsl(var(--gold-glow) / 0.05)",
                      }}
                    >
                      <Zap className="h-4 w-4" />
                      {bonusPool >= 120
                        ? `⚡ BONUS PRÊT — ${bonusPool}s accumulés (échangeable contre 1 vie si vous tombez à 0)`
                        : `⚡ BONUS : ${bonusPool}s / 120s (dépensez 120s pour récupérer 1 vie)`}
                    </motion.div>
                  )}

                  <Button onClick={nextStep} className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90">
                    {narrativeUnlockText
                      ? "RÉVÉLATION NARRATIVE →"
                      : currentEnigme < mission.enigmes.length - 1
                        ? "ÉNIGME SUIVANTE →"
                        : isStaticMission ? "COMPLÉTER →" : "CHOIX MORAL"}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── RESCUE OFFER — manual bonus exchange screen ── */}
          {phase === "rescue_offer" && (
            <motion.div
              key="rescue"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="space-y-6 text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 150, delay: 0.1 }}
                className="text-6xl"
              >
                💔
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <p className="text-xs font-display tracking-[0.4em] text-destructive mb-2">MISSION EN DANGER</p>
                <h2 className="text-3xl font-display font-bold text-destructive">PLUS DE VIES</h2>
                <p className="text-muted-foreground mt-2 text-sm">Vous n'avez plus de vie restante.</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-card border rounded-lg p-5 mx-auto max-w-xs"
                style={{ borderColor: "hsl(var(--gold-glow) / 0.4)", background: "hsl(var(--gold-glow) / 0.05)" }}
              >
                <p className="font-display tracking-wider text-xl mb-1" style={{ color: "hsl(var(--gold-glow))" }}>
                  ⚡ {bonusPool}s de bonus
                </p>
                <p className="text-sm text-muted-foreground">Dépensez 120s pour récupérer 1 vie et continuer</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3 max-w-xs mx-auto"
              >
                <Button
                  onClick={handleRescue}
                  className="w-full font-display tracking-wider text-base py-6"
                  style={{ background: "hsl(var(--gold-glow))", color: "hsl(0 0% 5%)" }}
                >
                  ⚡ DÉPENSER 120s → +1 VIE
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPhase("failed")}
                  className="w-full text-muted-foreground font-display tracking-wider"
                >
                  Abandonner la mission
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ── FAILED — cinematic tension screen ── */}

          {phase === "failed" && mission && (
            <motion.div
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden rounded-xl"
              style={{ background: "linear-gradient(180deg, hsl(0 30% 5%) 0%, hsl(220 20% 4%) 60%, hsl(220 20% 4%) 100%)" }}
            >
              <div className="absolute inset-0 scanline pointer-events-none opacity-40" />
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ background: "radial-gradient(ellipse at center, transparent 40%, hsl(0 70% 15% / 0.6) 100%)" }}
              />
              <div className="relative z-10 space-y-6 px-6 text-center w-full">
                <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.3, stiffness: 150 }}>
                  <XCircle className="h-24 w-24 mx-auto" style={{ color: "hsl(0 70% 50%)" }} />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                  {lives > 0 && score < SCORE_THRESHOLD ? (
                    <>
                      <p className="text-xs font-display tracking-[0.4em] mb-2" style={{ color: "hsl(0 65% 38%)" }}>SCORE INSUFFISANT</p>
                      <h2 className="text-4xl md:text-5xl font-display font-bold tracking-wider mb-3" style={{ color: "hsl(0 65% 42%)", textShadow: "0 0 30px hsl(0 70% 30% / 0.5)" }}>
                        {score}/{TOTAL_QUESTIONS}
                      </h2>
                      <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: "hsl(0 0% 95%)" }}>
                        Il faut <strong>{SCORE_THRESHOLD}/{TOTAL_QUESTIONS} minimum</strong> pour obtenir la pièce.<br />
                        Vous aviez encore des vies restantes, mais elles ne compensent pas le score final.<br />
                        <span className="opacity-70 text-xs">Les vies protègent contre l'élimination en cours de mission — l'objectif reste de répondre correctement à au moins {SCORE_THRESHOLD} questions.</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-display tracking-[0.4em] mb-2" style={{ color: "hsl(0 65% 38%)" }}>VIES ÉPUISÉES</p>
                      <h2 className="text-4xl md:text-5xl font-display font-bold tracking-wider mb-3" style={{ color: "hsl(0 65% 42%)", textShadow: "0 0 30px hsl(0 70% 30% / 0.5)" }}>ÉCHEC</h2>
                      <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: "hsl(0 0% 95%)" }}>
                        Le Cercle a détecté votre présence.<br />Vous pouvez recommencer depuis le début.
                      </p>
                    </>
                  )}
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="rounded-lg border px-6 py-4 inline-block" style={{ borderColor: "hsl(0 70% 25% / 0.5)", background: "hsl(0 20% 7% / 0.9)" }}>
                  <p className="text-3xl font-display font-bold mb-1" style={{ color: "hsl(0 65% 42%)" }}>{score} / {TOTAL_QUESTIONS}</p>
                  <p className="text-xs font-display tracking-wider" style={{ color: "hsl(0 0% 85%)" }}>BONNES RÉPONSES · MINIMUM REQUIS : {SCORE_THRESHOLD}/{TOTAL_QUESTIONS}</p>
                </motion.div>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="text-xs italic max-w-xs mx-auto leading-relaxed" style={{ color: "hsl(0 0% 70%)" }}>
                  "Le Cercle ne pardonne pas les erreurs. Mais chaque échec est un enseignement."<br />
                  <span className="not-italic font-display tracking-widest text-[10px]">— J. Valcourt</span>
                </motion.p>
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 }} className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mx-auto">
                  <Button onClick={retryMission} className="flex-1 font-display tracking-wider py-5 border-0" style={{ background: "hsl(0 70% 35%)", color: "white" }}>
                    <RotateCcw className="h-4 w-4 mr-2" />REJOUER
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dashboard")} className="flex-1 font-display tracking-wider py-5">
                    <ArrowLeft className="h-4 w-4 mr-2" />RETOUR AU QG
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ── NARRATIVE UNLOCK — cinematic overlay ── */}
          {phase === "narrative_unlock" && narrativeUnlockText && (
            <motion.div
              key="narrative_unlock"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="relative min-h-[60vh] flex flex-col items-center justify-center rounded-xl overflow-hidden"
              style={{ background: "linear-gradient(180deg, hsl(220 30% 4%) 0%, hsl(220 25% 7%) 100%)" }}
            >
              <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.15) 0%, transparent 70%)" }}
              />
              <div className="relative z-10 space-y-8 px-6 text-center max-w-sm mx-auto">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <p className="text-xs font-display tracking-[0.5em] mb-3" style={{ color: "hsl(var(--primary) / 0.6)" }}>
                    DÉVERROUILLAGE NARRATIF
                  </p>
                  <div className="w-px h-12 bg-primary/30 mx-auto mb-6" />
                  <p className="text-2xl font-display font-bold leading-relaxed" style={{ color: "hsl(var(--primary))", textShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}>
                    "{narrativeUnlockText}"
                  </p>
                  <div className="w-px h-12 bg-primary/30 mx-auto mt-6" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-xs text-muted-foreground font-display tracking-widest"
                >
                  — J. Valcourt
                </motion.p>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }}>
                  <Button
                    onClick={continueFromNarrativeUnlock}
                    className="font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 px-8"
                  >
                    CONTINUER LA MISSION →
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ── MORAL CHOICE ──────────────────────── */}
          {phase === "moral" && mission && mission.moral_choice && (
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


          {/* ── FINALE — cinematic fragment unlock ── */}
          {phase === "finale" && mission && (
            <motion.div key="finale" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="space-y-6 text-center">

              {/* Fragment unlock animation */}
              <motion.div
                className="relative mx-auto w-32 h-32 flex items-center justify-center"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 0.3, stiffness: 120 }}
              >
                {/* Outer glow ring */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ background: "radial-gradient(circle, hsl(var(--gold-glow) / 0.3) 0%, transparent 70%)" }}
                />
                {/* Puzzle piece icon */}
                <div
                  className="w-20 h-20 rounded-xl flex items-center justify-center"
                  style={{ background: "hsl(var(--primary) / 0.15)", border: "2px solid hsl(var(--primary) / 0.5)", boxShadow: "0 0 30px hsl(var(--gold-glow) / 0.3)" }}
                >
                  <Puzzle className="h-10 w-10" style={{ color: "hsl(var(--primary))" }} />
                </div>
                {/* Sparkle particles */}
                {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full"
                    style={{ background: "hsl(var(--primary))", top: "50%", left: "50%" }}
                    animate={{
                      x: [0, Math.cos((deg * Math.PI) / 180) * 50],
                      y: [0, Math.sin((deg * Math.PI) / 180) * 50],
                      opacity: [1, 0],
                      scale: [1, 0.3],
                    }}
                    transition={{ duration: 1.2, delay: 0.5 + i * 0.05, repeat: Infinity, repeatDelay: 1.5 }}
                  />
                ))}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <p className="text-xs font-display tracking-[0.4em] mb-2 text-primary">FRAGMENT OBTENU</p>
                <h2 className="text-3xl font-display font-bold text-primary text-glow tracking-wider mb-1">
                  {isStaticMission && fragmentReward
                    ? fragmentReward.name.toUpperCase()
                    : `${country?.name?.toUpperCase()} — DÉVERROUILLÉ`}
                </h2>
                <p className="text-sm text-muted-foreground">Une nouvelle pièce du puzzle mondial a été ajoutée à votre collection.</p>
              </motion.div>

              {/* Narrative fragment / fragment reward message */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="bg-card border border-primary/30 rounded-lg p-5 border-glow relative overflow-hidden text-left"
              >
                <div className="scanline absolute inset-0 pointer-events-none opacity-30" />
                <p className="text-xs font-display tracking-widest mb-2 text-primary">TRANSMISSION DÉCHIFFRÉE</p>
                <p className="text-foreground leading-relaxed italic text-sm relative z-10">
                  "{isStaticMission && fragmentReward
                    ? fragmentReward.unlocked_message
                    : mission.final_fragment ?? "Fragment obtenu. Le réseau se révèle un peu plus."}"
                </p>
                {isStaticMission && fragmentReward && (
                  <p className="text-xs font-display tracking-widest mt-2 relative z-10" style={{ color: "hsl(var(--primary) / 0.6)" }}>
                    TYPE : {fragmentReward.concept}
                  </p>
                )}
              </motion.div>

              {/* Score + XP */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-display font-bold text-primary">{score}/{TOTAL_QUESTIONS}</p>
                    <p className="text-xs text-muted-foreground font-display tracking-wider">ÉNIGMES RÉSOLUES</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-display tracking-wider mb-0.5">XP ESTIMÉ</p>
                    <p className="text-lg font-display font-bold text-primary">
                      +{50 + score * 25 + Math.max(0, 30 - Math.floor((Date.now() - missionStartTime) / 10000)) * 2 + (score === TOTAL_QUESTIONS ? 50 : 0)}
                    </p>
                  </div>
                </div>
                {score === TOTAL_QUESTIONS && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-primary font-display tracking-wider border-t border-border pt-3">
                    <Trophy className="h-4 w-4" />
                    MISSION PARFAITE +50 XP BONUS
                  </div>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }}>
                <Button onClick={completeMission} className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg">
                  COMPLÉTER LA MISSION
                </Button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
};

export default Mission;
