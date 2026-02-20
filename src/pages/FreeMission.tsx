import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Home, CheckCircle, XCircle, RotateCcw, Puzzle,
  MapPin, ArrowRight, Zap, Shield, Heart, Clock, AlertTriangle
} from "lucide-react";
import TypewriterText from "@/components/TypewriterText";
import { checkAndAwardBadges } from "@/lib/badges";
import type { Tables } from "@/integrations/supabase/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FreeCountryData {
  country: { code: string; name_fr?: string; name?: string };
  mission: {
    mission_id: string;
    mission_title: string;
    phase?: string;
    is_free?: boolean;
    detective?: string;
    intro_text?: string;
    intro?: string;
    order_index?: number;
    total_free?: number;
    format?: string;
  };
  scene?: {
    prompt?: string;
    setup?: string;
    choices: string[];
    correct_choice_index: number;
    success_text?: string;
    correct_feedback?: string;
    wrong_feedback?: string;
  };
  clue?: {
    title?: string;
    text?: string;
  };
  puzzle?: {
    type?: string;
    instruction?: string;
    question?: string;
    input?: string;
    solution_number?: number;
    solution_letter?: string;
    explain_if_failed?: string;
    explanation?: string;
    letter_choices?: string[];
  };
  final_question?: {
    question: string;
    choices: string[];
    answer_index: number;
    narrative_unlock?: string;
  };
  reward?: {
    letter_obtained: string;
    fragment?: { id: string; concept: string; name: string };
    jasper_quote?: string;
    next_country_code?: string | null;
    next_destination_hint?: string;
  };
  question_bank?: Array<{
    id: string;
    type: "A" | "B" | "C";
    question: string;
    choices: string[];
    answer_index: number;
    narrative_unlock?: string;
    hint_image?: { url: string; caption: string };
  }>;
  fragment_reward?: {
    id: string;
    name: string;
    concept: string;
    unlocked_message: string;
  };
  next_country_hint?: string;
}

type FreePhase =
  | "loading"
  | "intro"
  | "scene_choice"
  | "logic_puzzle"
  | "strategic"
  | "letter_reveal"
  | "reward"
  | "rescue_offer"
  | "failed";

function isNewFormat(data: FreeCountryData): boolean {
  return !!(data.scene || data.puzzle || data.final_question || data.reward);
}

const SIGNAL_INITIAL_SEQUENCE = ["CH", "FR", "EG", "US", "JP"];

// Derived from DB content (rewards.token.value) — used as fallback
const COUNTRY_LETTERS: Record<string, string> = {
  CH: "O",
  FR: "M",
  EG: "E",
  US: "G",
  JP: "A",
};

// Derived from DB content — used as fallback
const NEXT_COUNTRY_HINTS: Record<string, string> = {
  CH: "Les lumières cachent autant qu'elles révèlent. Direction la France.",
  FR: "Les pharaons savaient avant tout le monde. Cap sur l'Égypte.",
  EG: "Le rythme mondial se fixe dans une capitale. Direction Washington.",
  US: "L'Orient garde ses secrets les mieux enfouis. Direction le Japon.",
  JP: "Tous les nœuds sont maintenant actifs. Le signal initial est complet.",
};

// ── Free mission config ───────────────────────────────────────────────────────
const FREE_MISSION_CONFIG = {
  lives: 2,
  time_per_step: 90,
  bonus_rescue_threshold: 60,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Component ─────────────────────────────────────────────────────────────────

const FreeMission = () => {
  const { countryId } = useParams<{ countryId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [country, setCountry] = useState<Tables<"countries"> | null>(null);
  const [data, setData] = useState<FreeCountryData | null>(null);
  const [phase, setPhase] = useState<FreePhase>("loading");
  const [missionStartTime] = useState(() => Date.now());

  // The 3 selected questions — ancien format (question_bank A/B/C)
  type QBankItem = NonNullable<FreeCountryData["question_bank"]>[0];
  const [sceneQuestion, setSceneQuestion] = useState<QBankItem | null>(null);
  const [logicQuestion, setLogicQuestion] = useState<QBankItem | null>(null);
  const [strategicQuestion, setStrategicQuestion] = useState<QBankItem | null>(null);

  // Shuffled choices for each step
  const [sceneChoices, setSceneChoices] = useState<string[]>([]);
  const [logicChoices, setLogicChoices] = useState<string[]>([]);
  const [strategicChoices, setStrategicChoices] = useState<string[]>([]);

  // Answer state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [sceneCorrect, setSceneCorrect] = useState(false);
  const [sceneFeedback, setSceneFeedback] = useState<string>("");

  // The letter obtained
  const [earnedLetter, setEarnedLetter] = useState<string>("");

  // Narrative unlock text (from strategic answer)
  const [narrativeText, setNarrativeText] = useState<string>("");

  // Next country info
  const [nextCountry, setNextCountry] = useState<Tables<"countries"> | null>(null);

  // ── Lives, Timer, Bonus ─────────────────────────────────────────────────────
  const [lives, setLives] = useState(FREE_MISSION_CONFIG.lives);
  const [firstMistakeWarning, setFirstMistakeWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(FREE_MISSION_CONFIG.time_per_step);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [bonusPool, setBonusPool] = useState(0);

  // Which phases have a timer
  const timedPhases: FreePhase[] = ["scene_choice", "logic_puzzle", "strategic"];
  const isTimedPhase = timedPhases.includes(phase);

  // ── Load mission ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!countryId) return;
    loadFreeMission();
  }, [countryId]);

  const loadFreeMission = async () => {
    const { data: countryData } = await supabase
      .from("countries")
      .select("*")
      .eq("id", countryId!)
      .single();

    if (!countryData) { navigate("/dashboard"); return; }
    setCountry(countryData);

    // Load next country from DB (countries_missions completion.next_country_code)
    const { data: missionRow } = await supabase
      .from("countries_missions")
      .select("content")
      .eq("code", countryData.code)
      .single();

    const dbContent = missionRow?.content as any;
    const nextCode = dbContent?.completion?.next_country_code
      ?? getNextCode(countryData.code);

    if (nextCode) {
      const { data: nextData } = await supabase
        .from("countries")
        .select("*")
        .eq("code", nextCode)
        .single();
      if (nextData) setNextCountry(nextData);
    }

    // Try to build mission data from DB content first
    let json: FreeCountryData | null = null;

    if (dbContent?.gameplay?.questions?.length > 0 && dbContent?.story?.intro) {
      // Map DB JSONB → FreeCountryData (question_bank format)
      const questions = dbContent.gameplay.questions as any[];
      const qbank = questions.map((q: any, i: number) => ({
        id: q.id ?? `${countryData.code}_Q${i + 1}`,
        type: (i < questions.length - 1 ? (i === 0 ? "A" : "B") : "C") as "A" | "B" | "C",
        question: q.prompt ?? q.question,
        choices: (q.options ?? []).map((o: any) => o.text ?? o),
        answer_index: q.answer?.value
          ? (q.options ?? []).findIndex((o: any) => (o.id ?? o) === q.answer.value)
          : 0,
        narrative_unlock: q.narrative_unlock,
      }));

      json = {
        country: { code: countryData.code, name_fr: dbContent.meta?.country ?? countryData.name },
        mission: {
          mission_id: `${countryData.code}-S0-FREE`,
          mission_title: dbContent.story?.mission_title ?? `Mission : ${countryData.name}`,
          phase: "SIGNAL_INITIAL",
          is_free: true,
          detective: "Jasper Valcourt",
          intro: dbContent.story?.intro,
        },
        question_bank: qbank,
        fragment_reward: {
          id: dbContent.rewards?.puzzle_piece?.piece_id ?? `FRAG-${countryData.code}-001`,
          name: `Fragment de ${countryData.name}`,
          concept: dbContent.rewards?.puzzle_piece?.shape_family ?? "FRAGMENT",
          unlocked_message: dbContent.story?.lore_reveal?.reveal_text ?? "Un nouveau nœud s'est activé.",
        },
      };
    }

    // Fallback to static JSON if DB content insufficient
    if (!json) {
      try {
        const res = await fetch(`/content/countries/${countryData.code}.json`);
        if (!res.ok) throw new Error("no static file");
        json = await res.json();
      } catch {
        navigate(`/mission-classic/${countryId}`);
        return;
      }
    }

    if (!json) return;
    setData(json);

    if (isNewFormat(json)) {
      const letter = json.reward?.letter_obtained
        ?? COUNTRY_LETTERS[countryData.code]
        ?? "?";
      setEarnedLetter(letter);
      if (json.scene?.choices) setSceneChoices([...json.scene.choices]);
      if (json.final_question?.choices) setStrategicChoices(shuffle([...json.final_question.choices]));
    } else {
      const qbank = json.question_bank ?? [];
      const typeA = shuffle(qbank.filter(q => q.type === "A"));
      const typeB = shuffle(qbank.filter(q => q.type === "B"));
      const typeC = shuffle(qbank.filter(q => q.type === "C"));

      const sq = typeA[0] ?? null;
      const lq = typeB[0] ?? null;
      const stq = typeC[0] ?? null;

      setSceneQuestion(sq);
      setLogicQuestion(lq);
      setStrategicQuestion(stq);

      if (sq) setSceneChoices(shuffle([...sq.choices]));
      if (lq) setLogicChoices(shuffle([...lq.choices]));
      if (stq) setStrategicChoices(shuffle([...stq.choices]));

      // Set letter from DB token if available
      const letter = (dbContent?.rewards?.token?.value as string)
        ?? COUNTRY_LETTERS[countryData.code]
        ?? "?";
      setEarnedLetter(letter);
    }

    setPhase("intro");
  };

  function getNextCode(currentCode: string): string | null {
    const idx = SIGNAL_INITIAL_SEQUENCE.indexOf(currentCode);
    if (idx === -1 || idx === SIGNAL_INITIAL_SEQUENCE.length - 1) return null;
    return SIGNAL_INITIAL_SEQUENCE[idx + 1];
  }

  // ── Timer ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isTimedPhase || answerRevealed) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTimeLeft(FREE_MISSION_CONFIG.time_per_step);
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
  }, [phase, answerRevealed]);

  const handleTimeOut = useCallback(() => {
    setAnswerRevealed(true);
    setSelectedAnswer("__timeout__");
    if (timerRef.current) clearInterval(timerRef.current);

    // scene_choice: no life penalty (narrative step)
    if (phase === "scene_choice") {
      setSceneCorrect(false);
      setSceneFeedback("⏱ Temps écoulé — Jasper note le retard mais continue la mission.");
      return;
    }

    // logic_puzzle / strategic: lose 1 life
    const newLives = lives - 1;
    setLives(newLives);

    if (newLives <= 0) {
      if (bonusPool >= FREE_MISSION_CONFIG.bonus_rescue_threshold) {
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
  }, [lives, bonusPool, phase]);

  // ── Rescue handler ──────────────────────────────────────────────────────────

  const handleRescue = () => {
    setBonusPool(prev => prev - FREE_MISSION_CONFIG.bonus_rescue_threshold);
    setLives(1);
    setAnswerRevealed(false);
    setSelectedAnswer(null);
    setFirstMistakeWarning(true);
    // Advance to next step
    if (phase === "rescue_offer") {
      // Determine which step we were on based on where the failure occurred
      // Since rescue is triggered from logic_puzzle or strategic, advance
      setPhase("strategic"); // will be overridden if we need to go further
    }
    toast({ title: "⚡ Vie récupérée !", description: `${FREE_MISSION_CONFIG.bonus_rescue_threshold}s de bonus utilisés. Mission continue.` });
  };

  // ── Helper: handle wrong answer with lives ──────────────────────────────────

  const handleWrongWithLives = (nextPhaseOnSurvive: FreePhase | null) => {
    const newLives = lives - 1;
    setLives(newLives);

    if (newLives <= 0) {
      if (bonusPool >= FREE_MISSION_CONFIG.bonus_rescue_threshold) {
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
      // Don't auto-advance; let the player click "Continuer"
    }
  };

  // ── Answer handlers ─────────────────────────────────────────────────────────

  // Nouveau format : scène immersive (no life penalty)
  const handleNewFormatSceneAnswer = (choice: string) => {
    if (answerRevealed || !data?.scene) return;
    const scene = data.scene;
    const correctChoice = scene.choices[scene.correct_choice_index];
    const correct = choice === correctChoice;
    setSelectedAnswer(choice);
    setAnswerRevealed(true);
    setSceneCorrect(correct);
    if (timerRef.current) clearInterval(timerRef.current);
    if (correct) {
      setBonusPool(prev => prev + timeLeft);
    }
    setSceneFeedback(correct
      ? (scene.success_text ?? scene.correct_feedback ?? "✓ Bonne analyse.")
      : (scene.wrong_feedback ?? "✗ Ce n'est pas le bon angle."));
  };

  // Ancien format : question Type A (no life penalty)
  const handleSceneAnswer = (choice: string) => {
    if (answerRevealed || !sceneQuestion) return;
    const correct = choice === sceneQuestion.choices[sceneQuestion.answer_index];
    setSelectedAnswer(choice);
    setAnswerRevealed(true);
    setSceneCorrect(correct);
    if (timerRef.current) clearInterval(timerRef.current);
    if (correct) {
      setBonusPool(prev => prev + timeLeft);
    }
  };

  // Ancien format : question Type B (life penalty)
  const handleLogicAnswer = (choice: string) => {
    if (answerRevealed || !logicQuestion) return;
    const correct = choice === logicQuestion.choices[logicQuestion.answer_index];
    setSelectedAnswer(choice);
    setAnswerRevealed(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (correct) {
      setBonusPool(prev => prev + timeLeft);
    } else {
      handleWrongWithLives("strategic");
    }
  };

  // Nouveau format : question finale stratégique (life penalty)
  const handleNewFormatFinalAnswer = (choice: string) => {
    if (answerRevealed || !data?.final_question) return;
    const fq = data.final_question;
    const correct = choice === fq.choices[fq.answer_index];
    setSelectedAnswer(choice);
    setAnswerRevealed(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (correct) {
      setBonusPool(prev => prev + timeLeft);
      if (fq.narrative_unlock) setNarrativeText(fq.narrative_unlock);
      setTimeout(() => setPhase("letter_reveal"), 1000);
    } else {
      handleWrongWithLives(null);
    }
  };

  // Ancien format : question Type C (life penalty)
  const handleStrategicAnswer = (choice: string) => {
    if (answerRevealed || !strategicQuestion) return;
    const correct = choice === strategicQuestion.choices[strategicQuestion.answer_index];
    setSelectedAnswer(choice);
    setAnswerRevealed(true);
    if (timerRef.current) clearInterval(timerRef.current);

    if (correct && strategicQuestion.narrative_unlock) {
      setNarrativeText(strategicQuestion.narrative_unlock);
    }

    if (correct) {
      setBonusPool(prev => prev + timeLeft);
      const letter = country ? (COUNTRY_LETTERS[country.code] ?? "?") : "?";
      setEarnedLetter(letter);
      setTimeout(() => setPhase("letter_reveal"), 1000);
    } else {
      handleWrongWithLives(null);
    }
  };

  // ── Continue after wrong answer (survived) ──────────────────────────────────

  const continueAfterWrong = (nextPhase: FreePhase) => {
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setPhase(nextPhase);
  };

  // ── Complete mission ─────────────────────────────────────────────────────────

  const completeMission = async () => {
    if (!countryId || !data || !country) return;

    const timeElapsed = Math.round((Date.now() - missionStartTime) / 1000);
    const xpGained = 150;

    if (!user) {
      const prev = JSON.parse(localStorage.getItem("wep_demo_progress") || "{}");
      prev[countryId] = { score: 3, total: 3, time: timeElapsed, letter: earnedLetter };
      localStorage.setItem("wep_demo_progress", JSON.stringify(prev));
      toast({ title: "Mission accomplie! (Mode Démo)", description: `Lettre obtenue : ${earnedLetter} · Créez un compte pour sauvegarder.` });
      navigate(`/mission/${countryId}/complete?score=3&total=3&xp=${xpGained}&demo=1`);
      return;
    }

    const { error: rpcError } = await (supabase as any).rpc("complete_country_attempt", {
      p_user_id: user.id,
      p_country_code: country.code,
      p_score: 3,
      p_total: 3,
    });
    if (rpcError) console.error("complete_country_attempt error:", rpcError);

    await supabase.from("missions").insert({
      user_id: user.id,
      country_id: countryId,
      mission_title: data.mission.mission_title,
      mission_data: { letter: earnedLetter, format: isNewFormat(data) ? "free_v3" : "free_v2" } as any,
      completed: true,
      score: 3,
      completed_at: new Date().toISOString(),
    });

    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("xp, level, streak, longest_streak")
      .eq("user_id", user.id)
      .single();
    const prof = profileRaw as any;

    const newStreak = (prof?.streak ?? 0) + 1;
    const longestStreak = Math.max(prof?.longest_streak ?? 0, newStreak);
    const newXp = (prof?.xp ?? 0) + xpGained;
    const newLevel = Math.floor(newXp / 200) + 1;

    await (supabase.from("profiles") as any).update({
      xp: newXp, level: newLevel, streak: newStreak,
      longest_streak: longestStreak, last_mission_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    const { count: missionCount } = await supabase
      .from("missions")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .eq("completed", true);

    checkAndAwardBadges({
      userId: user.id, score: 3, total: 3, timeElapsed,
      usedHint: false, ignoredFakeClue: true,
      missionCount: missionCount ?? 1, streak: newStreak,
      trustLevel: 50, suspicionLevel: 0, completedCountries: 1, xp: newXp,
    });

    toast({ title: "Mission accomplie !", description: `Lettre débloquée : ${earnedLetter} · +${xpGained} XP` });
    navigate(`/mission/${countryId}/complete?score=3&total=3&xp=${xpGained}&streak=${newStreak}`);
  };

  const retryMission = () => {
    setPhase("loading");
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setSceneCorrect(false);
    setSceneFeedback("");
    setEarnedLetter("");
    setNarrativeText("");
    setLives(FREE_MISSION_CONFIG.lives);
    setFirstMistakeWarning(false);
    setBonusPool(0);
    setTimeLeft(FREE_MISSION_CONFIG.time_per_step);
    loadFreeMission();
  };

  // ── Progression index (1-5) ──────────────────────────────────────────────────

  const missionIndex = country ? SIGNAL_INITIAL_SEQUENCE.indexOf(country.code) + 1 : 0;

  // ── Timer display helpers ───────────────────────────────────────────────────

  const timerPercent = (timeLeft / FREE_MISSION_CONFIG.time_per_step) * 100;
  const timerColor = timerPercent > 50 ? "bg-primary" : timerPercent > 25 ? "bg-yellow-500" : "bg-destructive";

  // ── Determine if current wrong answer allows continuing ─────────────────────
  // After a wrong answer on logic_puzzle or strategic, if lives > 0 the player
  // can click "Continuer" to advance. We track this state.
  const wrongButAlive = answerRevealed && selectedAnswer !== null && lives > 0 && (
    // logic_puzzle wrong in old format
    (phase === "logic_puzzle" && !isNewFormat(data!) && logicQuestion && selectedAnswer !== logicQuestion.choices[logicQuestion.answer_index]) ||
    // logic_puzzle wrong in new format (letter puzzle)
    (phase === "logic_puzzle" && isNewFormat(data!) && data?.puzzle && selectedAnswer !== data.puzzle.solution_letter) ||
    // strategic wrong in old format
    (phase === "strategic" && !isNewFormat(data!) && strategicQuestion && selectedAnswer !== strategicQuestion.choices[strategicQuestion.answer_index]) ||
    // strategic wrong in new format
    (phase === "strategic" && isNewFormat(data!) && data?.final_question && selectedAnswer !== data.final_question.choices[data.final_question.answer_index]) ||
    // timeout
    selectedAnswer === "__timeout__"
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-primary font-display tracking-widest animate-pulse">CHARGEMENT DE LA MISSION...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
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

          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-display text-primary tracking-wider">
              {country?.name?.toUpperCase()}
            </span>
          </div>

          {/* Lives + Progression */}
          <div className="flex items-center gap-3">
            {/* Lives hearts */}
            {phase !== "intro" && phase !== "letter_reveal" && phase !== "reward" && (
              <div className="flex items-center gap-1" title="Vies restantes">
                {Array.from({ length: FREE_MISSION_CONFIG.lives }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={i === lives && lives < FREE_MISSION_CONFIG.lives ? { scale: [1.4, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Heart className={`h-4 w-4 transition-all ${
                      i < lives ? "text-destructive fill-destructive" : "text-border"
                    }`} />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Progression 1/5 */}
            <div className="flex items-center gap-1.5">
              {SIGNAL_INITIAL_SEQUENCE.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-5 rounded-full transition-all ${
                    i < missionIndex ? "bg-primary" : i === missionIndex - 1 ? "bg-primary/60" : "bg-border"
                  }`}
                />
              ))}
              <span className="text-xs text-muted-foreground font-display ml-1 tabular-nums">{missionIndex}/5</span>
            </div>
          </div>
        </div>

        {/* First-mistake warning banner */}
        <AnimatePresence>
          {firstMistakeWarning && isTimedPhase && (
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

        {/* Bonus pool bar */}
        {phase !== "intro" && phase !== "letter_reveal" && phase !== "reward" && phase !== "failed" && (
          <div className="border-t px-4 py-1.5" style={{ borderColor: "hsl(var(--gold-glow) / 0.25)" }}>
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <span className="text-xs font-display tracking-wider flex-shrink-0" style={{ color: "hsl(var(--gold-glow))" }}>⚡ BONUS</span>
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, (bonusPool / FREE_MISSION_CONFIG.bonus_rescue_threshold) * 100)}%`, backgroundColor: "hsl(var(--gold-glow))" }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="text-xs font-display flex-shrink-0 tabular-nums" style={{ color: bonusPool >= FREE_MISSION_CONFIG.bonus_rescue_threshold ? "hsl(var(--gold-glow))" : "hsl(var(--muted-foreground))" }}>
                {bonusPool}s{bonusPool >= FREE_MISSION_CONFIG.bonus_rescue_threshold ? " ✓" : `/${FREE_MISSION_CONFIG.bonus_rescue_threshold}s`}
              </span>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">

          {/* ── INTRO ── */}
          {phase === "intro" && data && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Header badge */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-display tracking-[0.4em] text-primary/60">SIGNAL INITIAL — {missionIndex}/5</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <h1 className="text-3xl font-display font-bold text-primary text-glow tracking-wider">
                {data.mission.mission_title}
              </h1>

              {/* Mission rules card */}
              <div className="bg-card border border-primary/20 rounded-lg p-4 grid grid-cols-3 gap-4 text-center text-xs font-display">
                <div>
                  <div className="flex justify-center gap-0.5 mb-1">
                    {Array.from({ length: FREE_MISSION_CONFIG.lives }).map((_, i) => <Heart key={i} className="h-4 w-4 text-destructive fill-destructive" />)}
                  </div>
                  <p className="text-muted-foreground tracking-wider">{FREE_MISSION_CONFIG.lives} VIES</p>
                </div>
                <div>
                  <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-muted-foreground tracking-wider">{FREE_MISSION_CONFIG.time_per_step}S / ÉTAPE</p>
                </div>
                <div>
                  <div className="text-2xl mb-1">⚡</div>
                  <p className="text-muted-foreground tracking-wider">DÉCISION<br />STRATÉGIQUE</p>
                </div>
              </div>

              {/* Intro narrative */}
              <div className="bg-card border border-border rounded-lg p-6 border-glow relative overflow-hidden">
                <div className="scanline absolute inset-0 pointer-events-none opacity-10" />
                <TypewriterText
                  text={data.mission.intro_text ?? data.mission.intro ?? ""}
                  speed={18}
                  className="text-foreground leading-relaxed whitespace-pre-line relative z-10"
                />
              </div>

              <Button
                onClick={() => setPhase("scene_choice")}
                className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-base"
              >
                ENTRER DANS LA SCÈNE →
              </Button>
            </motion.div>
          )}

          {/* ── SCENE CHOICE ── Nouveau format */}
          {phase === "scene_choice" && data && isNewFormat(data) && data.scene && (
            <motion.div
              key="scene-new"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <StepIndicator step={1} label="SCÈNE IMMERSIVE" />

              {/* Timer bar */}
              {!answerRevealed && <TimerBar timeLeft={timeLeft} total={FREE_MISSION_CONFIG.time_per_step} timerPercent={timerPercent} timerColor={timerColor} />}

              <div className="bg-card border border-primary/15 rounded-lg px-5 py-4 relative overflow-hidden">
                <div className="scanline absolute inset-0 pointer-events-none opacity-10" />
                <p className="text-xs font-display tracking-[0.4em] text-primary/60 mb-2 relative z-10">TRANSMISSION EN COURS</p>
                <p className="text-foreground leading-relaxed relative z-10 whitespace-pre-line">
                  {data.scene.prompt ?? data.scene.setup}
                </p>
              </div>

              {data.clue && (
                <div className="rounded-lg p-4 border border-primary/20 bg-primary/4 text-sm">
                  <p className="text-xs font-display tracking-widest text-primary/60 mb-1">{data.clue.title}</p>
                  <p className="text-muted-foreground whitespace-pre-line">{data.clue.text}</p>
                </div>
              )}

              <div className="space-y-3">
                {data.scene.choices.map((choice, i) => {
                  const correctChoice = data.scene!.choices[data.scene!.correct_choice_index];
                  const isCorrect = choice === correctChoice;
                  const isSelected = choice === selectedAnswer;
                  let cls = "border-border hover:border-primary/50 cursor-pointer hover:bg-primary/5";
                  if (answerRevealed) {
                    if (isCorrect) cls = "border-primary bg-primary/10 cursor-default";
                    else if (isSelected) cls = "border-destructive bg-destructive/10 cursor-default";
                    else cls = "border-border opacity-40 cursor-default";
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleNewFormatSceneAnswer(choice)}
                      disabled={answerRevealed}
                      className={`w-full text-left p-4 rounded-lg border transition-all bg-card ${cls}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-foreground leading-snug">{choice}</span>
                        {answerRevealed && isCorrect && <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />}
                        {answerRevealed && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {answerRevealed && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className={`rounded-lg px-5 py-4 border text-sm ${
                    sceneCorrect ? "border-primary/40 bg-primary/8 text-primary" : "border-muted-foreground/30 bg-muted/30 text-muted-foreground"
                  }`}>
                    {sceneFeedback}
                  </div>
                  <Button
                    onClick={() => { setSelectedAnswer(null); setAnswerRevealed(false); setPhase("logic_puzzle"); }}
                    className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    CONTINUER L'ENQUÊTE →
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── SCENE CHOICE ── Ancien format */}
          {phase === "scene_choice" && data && !isNewFormat(data) && sceneQuestion && (
            <motion.div
              key="scene-old"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <StepIndicator step={1} label="SCÈNE IMMERSIVE" />

              {!answerRevealed && <TimerBar timeLeft={timeLeft} total={FREE_MISSION_CONFIG.time_per_step} timerPercent={timerPercent} timerColor={timerColor} />}

              <div className="bg-card border border-primary/15 rounded-lg px-5 py-4 flex items-start gap-3">
                <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground italic">
                  Jasper observe la situation. Un choix s'impose. Analysez les données disponibles.
                </p>
              </div>

              <h2 className="text-xl font-display font-bold text-foreground leading-snug">
                {sceneQuestion.question}
              </h2>

              <div className="space-y-3">
                {sceneChoices.map((choice, i) => {
                  const isCorrect = choice === sceneQuestion.choices[sceneQuestion.answer_index];
                  const isSelected = choice === selectedAnswer;
                  let cls = "border-border hover:border-primary/50 cursor-pointer hover:bg-primary/5";
                  if (answerRevealed) {
                    if (isCorrect) cls = "border-primary bg-primary/10 cursor-default";
                    else if (isSelected) cls = "border-destructive bg-destructive/10 cursor-default";
                    else cls = "border-border opacity-40 cursor-default";
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleSceneAnswer(choice)}
                      disabled={answerRevealed}
                      className={`w-full text-left p-4 rounded-lg border transition-all bg-card ${cls}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-foreground leading-snug">{choice}</span>
                        {answerRevealed && isCorrect && <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />}
                        {answerRevealed && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {answerRevealed && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className={`rounded-lg px-5 py-4 border text-sm font-display tracking-wider ${
                    sceneCorrect ? "border-primary/40 bg-primary/8 text-primary" : "border-muted-foreground/30 bg-muted/30 text-muted-foreground"
                  }`}>
                    {sceneCorrect ? "✓ ANALYSE CORRECTE — Jasper confirme votre évaluation." : "✗ ANALYSE INCORRECTE — Jasper note l'erreur mais continue la mission."}
                  </div>
                  <Button
                    onClick={() => { setSelectedAnswer(null); setAnswerRevealed(false); setPhase("logic_puzzle"); }}
                    className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    PASSER À L'ÉNIGME LOGIQUE →
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── LOGIC PUZZLE ── Nouveau format */}
          {phase === "logic_puzzle" && data && isNewFormat(data) && data.puzzle && (
            <motion.div
              key="logic-new"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <StepIndicator step={2} label="ÉNIGME LOGIQUE" />

              {!answerRevealed && <TimerBar timeLeft={timeLeft} total={FREE_MISSION_CONFIG.time_per_step} timerPercent={timerPercent} timerColor={timerColor} />}

              <div
                className="rounded-xl p-5 space-y-3 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--primary) / 0.05))",
                  border: "1px solid hsl(var(--primary) / 0.25)",
                }}
              >
                <div className="scanline absolute inset-0 pointer-events-none opacity-10" />
                <p className="text-xs font-display tracking-[0.4em] text-primary/60 relative z-10">TRANSMISSION CRYPTÉE</p>
                {data.puzzle.input && (
                  <p className="text-4xl font-display font-bold text-primary text-center relative z-10 tracking-[0.3em]">
                    {data.puzzle.input}
                  </p>
                )}
                <p className="text-sm text-muted-foreground relative z-10 whitespace-pre-line">
                  {data.puzzle.instruction ?? data.puzzle.question}
                </p>
              </div>

              {(() => {
                const sol = data.puzzle!.solution_letter ?? "A";
                const distractors = ["ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                  .split("")
                  .filter(l => l !== sol)]
                  .flat()
                  .sort(() => Math.random() - 0.5)
                  .slice(0, 3);
                const choices = shuffle([sol, ...distractors]);
                return (
                  <div className="grid grid-cols-4 gap-3">
                    {choices.map((letter, i) => {
                      const isCorrect = letter === sol;
                      const isSelected = letter === selectedAnswer;
                      let cls = "border-border hover:border-primary/50 cursor-pointer hover:bg-primary/5";
                      if (answerRevealed) {
                        if (isCorrect) cls = "border-primary bg-primary/10 cursor-default";
                        else if (isSelected) cls = "border-destructive bg-destructive/10 cursor-default";
                        else cls = "border-border opacity-40 cursor-default";
                      }
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (answerRevealed) return;
                            setSelectedAnswer(letter);
                            setAnswerRevealed(true);
                            if (timerRef.current) clearInterval(timerRef.current);
                            if (letter === sol) {
                              setBonusPool(prev => prev + timeLeft);
                            } else {
                              handleWrongWithLives(null);
                            }
                          }}
                          disabled={answerRevealed}
                          className={`p-5 rounded-lg border transition-all bg-card text-center font-display text-2xl font-bold ${cls}`}
                          style={{ color: answerRevealed && isCorrect ? "hsl(var(--primary))" : undefined }}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {answerRevealed && selectedAnswer === data.puzzle.solution_letter && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="rounded-lg px-5 py-4 border border-primary/40 bg-primary/8 text-primary text-sm font-display tracking-wider">
                    ✓ LETTRE IDENTIFIÉE — {data.puzzle.explanation ?? `La lettre ${data.puzzle.solution_letter} a été décodée.`}
                  </div>
                  <Button
                    onClick={() => { setSelectedAnswer(null); setAnswerRevealed(false); setPhase("strategic"); }}
                    className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    DÉCISION FINALE →
                  </Button>
                </motion.div>
              )}

              {/* Wrong answer but survived — continue button */}
              {answerRevealed && selectedAnswer !== null && selectedAnswer !== data.puzzle.solution_letter && lives > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="rounded-lg px-5 py-4 border border-destructive/40 bg-destructive/8 text-destructive text-sm font-display tracking-wider">
                    ✗ MAUVAISE LETTRE — {data.puzzle.explain_if_failed ?? "Ce n'est pas la bonne lettre."} Vous continuez avec {lives} vie{lives > 1 ? "s" : ""}.
                  </div>
                  <Button
                    onClick={() => continueAfterWrong("strategic")}
                    className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    CONTINUER → DÉCISION FINALE
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── LOGIC PUZZLE ── Ancien format */}
          {phase === "logic_puzzle" && data && !isNewFormat(data) && logicQuestion && (
            <motion.div
              key="logic-old"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <StepIndicator step={2} label="ÉNIGME LOGIQUE" />

              {!answerRevealed && <TimerBar timeLeft={timeLeft} total={FREE_MISSION_CONFIG.time_per_step} timerPercent={timerPercent} timerColor={timerColor} />}

              <div
                className="rounded-xl p-5 space-y-3 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--primary) / 0.05))",
                  border: "1px solid hsl(var(--primary) / 0.25)",
                }}
              >
                <div className="scanline absolute inset-0 pointer-events-none opacity-10" />
                <p className="text-xs font-display tracking-[0.4em] text-primary/60 relative z-10">TRANSMISSION CRYPTÉE</p>
                <p className="text-sm text-muted-foreground italic relative z-10">
                  Un code intercepté révèle un mécanisme du système. Résolvez l'énigme pour continuer.
                </p>
              </div>

              <h2 className="text-xl font-display font-bold text-foreground leading-snug">
                {logicQuestion.question}
              </h2>

              <div className="space-y-3">
                {logicChoices.map((choice, i) => {
                  const isCorrect = choice === logicQuestion.choices[logicQuestion.answer_index];
                  const isSelected = choice === selectedAnswer;
                  let cls = "border-border hover:border-primary/50 cursor-pointer hover:bg-primary/5";
                  if (answerRevealed) {
                    if (isCorrect) cls = "border-primary bg-primary/10 cursor-default";
                    else if (isSelected) cls = "border-destructive bg-destructive/10 cursor-default";
                    else cls = "border-border opacity-40 cursor-default";
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleLogicAnswer(choice)}
                      disabled={answerRevealed}
                      className={`w-full text-left p-4 rounded-lg border transition-all bg-card ${cls}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-foreground">{choice}</span>
                        {answerRevealed && isCorrect && <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />}
                        {answerRevealed && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Correct — continue */}
              {answerRevealed && selectedAnswer === logicQuestion.choices[logicQuestion.answer_index] && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Button
                    onClick={() => { setSelectedAnswer(null); setAnswerRevealed(false); setPhase("strategic"); }}
                    className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    DÉCISION FINALE →
                  </Button>
                </motion.div>
              )}

              {/* Wrong but alive — continue */}
              {answerRevealed && selectedAnswer !== null && selectedAnswer !== logicQuestion.choices[logicQuestion.answer_index] && lives > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="rounded-lg px-5 py-4 border border-destructive/40 bg-destructive/8 text-destructive text-sm font-display tracking-wider">
                    ✗ MAUVAISE RÉPONSE — Vous continuez avec {lives} vie{lives > 1 ? "s" : ""}.
                  </div>
                  <Button
                    onClick={() => continueAfterWrong("strategic")}
                    className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    CONTINUER → DÉCISION FINALE
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── STRATEGIC QUESTION ── Nouveau format */}
          {phase === "strategic" && data && isNewFormat(data) && data.final_question && (
            <motion.div
              key="strategic-new"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <StepIndicator step={3} label="DÉCISION STRATÉGIQUE" isCritical />

              {!answerRevealed && <TimerBar timeLeft={timeLeft} total={FREE_MISSION_CONFIG.time_per_step} timerPercent={timerPercent} timerColor={timerColor} />}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="rounded-lg px-5 py-4 border text-sm"
                style={{ borderColor: "hsl(var(--primary) / 0.5)", background: "hsl(var(--primary) / 0.06)" }}
              >
                <p className="font-display tracking-wider text-primary text-xs mb-1">⚡ QUESTION CRITIQUE</p>
                <p className="text-muted-foreground">
                  Cette décision détermine si vous obtenez le fragment. Une erreur coûte une vie.
                </p>
              </motion.div>

              <h2 className="text-2xl font-display font-bold text-foreground leading-snug">
                {data.final_question.question}
              </h2>

              <div className="space-y-3">
                {strategicChoices.map((choice, i) => {
                  const isCorrect = choice === data.final_question!.choices[data.final_question!.answer_index];
                  const isSelected = choice === selectedAnswer;
                  let cls = "border-border hover:border-primary/50 cursor-pointer hover:bg-primary/5";
                  if (answerRevealed) {
                    if (isCorrect) cls = "border-primary bg-primary/10 cursor-default";
                    else if (isSelected) cls = "border-destructive bg-destructive/10 cursor-default";
                    else cls = "border-border opacity-40 cursor-default";
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleNewFormatFinalAnswer(choice)}
                      disabled={answerRevealed}
                      className={`w-full text-left p-4 rounded-lg border transition-all bg-card ${cls}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-foreground leading-snug">{choice}</span>
                        {answerRevealed && isCorrect && <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />}
                        {answerRevealed && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Wrong but alive on strategic — need to retry the mission since it's the last step */}
              {answerRevealed && selectedAnswer !== null && selectedAnswer !== data.final_question.choices[data.final_question.answer_index] && lives > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="rounded-lg px-5 py-4 border border-destructive/40 bg-destructive/8 text-destructive text-sm font-display tracking-wider">
                    ✗ MAUVAISE RÉPONSE — Vous avez encore {lives} vie{lives > 1 ? "s" : ""}. Tentez à nouveau la question.
                  </div>
                  <Button
                    onClick={() => { setSelectedAnswer(null); setAnswerRevealed(false); }}
                    className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    RÉESSAYER LA QUESTION →
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── STRATEGIC QUESTION ── Ancien format */}
          {phase === "strategic" && data && !isNewFormat(data) && strategicQuestion && (
            <motion.div
              key="strategic-old"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <StepIndicator step={3} label="DÉCISION STRATÉGIQUE" isCritical />

              {!answerRevealed && <TimerBar timeLeft={timeLeft} total={FREE_MISSION_CONFIG.time_per_step} timerPercent={timerPercent} timerColor={timerColor} />}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="rounded-lg px-5 py-4 border text-sm"
                style={{ borderColor: "hsl(var(--primary) / 0.5)", background: "hsl(var(--primary) / 0.06)" }}
              >
                <p className="font-display tracking-wider text-primary text-xs mb-1">⚡ QUESTION CRITIQUE</p>
                <p className="text-muted-foreground">
                  Cette décision détermine si vous obtenez le fragment. Une erreur coûte une vie.
                </p>
              </motion.div>

              <h2 className="text-2xl font-display font-bold text-foreground leading-snug">
                {strategicQuestion.question}
              </h2>

              <div className="space-y-3">
                {strategicChoices.map((choice, i) => {
                  const isCorrect = choice === strategicQuestion.choices[strategicQuestion.answer_index];
                  const isSelected = choice === selectedAnswer;
                  let cls = "border-border hover:border-primary/50 cursor-pointer hover:bg-primary/5";
                  if (answerRevealed) {
                    if (isCorrect) cls = "border-primary bg-primary/10 cursor-default";
                    else if (isSelected) cls = "border-destructive bg-destructive/10 cursor-default";
                    else cls = "border-border opacity-40 cursor-default";
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleStrategicAnswer(choice)}
                      disabled={answerRevealed}
                      className={`w-full text-left p-4 rounded-lg border transition-all bg-card ${cls}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-foreground leading-snug">{choice}</span>
                        {answerRevealed && isCorrect && <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />}
                        {answerRevealed && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Wrong but alive on strategic — retry */}
              {answerRevealed && selectedAnswer !== null && selectedAnswer !== strategicQuestion.choices[strategicQuestion.answer_index] && lives > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="rounded-lg px-5 py-4 border border-destructive/40 bg-destructive/8 text-destructive text-sm font-display tracking-wider">
                    ✗ MAUVAISE RÉPONSE — Vous avez encore {lives} vie{lives > 1 ? "s" : ""}. Tentez à nouveau.
                  </div>
                  <Button
                    onClick={() => { setSelectedAnswer(null); setAnswerRevealed(false); }}
                    className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    RÉESSAYER LA QUESTION →
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── RESCUE OFFER ── */}
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
                <p className="text-sm text-muted-foreground">Dépensez {FREE_MISSION_CONFIG.bonus_rescue_threshold}s pour récupérer 1 vie et continuer</p>
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
                  ⚡ DÉPENSER {FREE_MISSION_CONFIG.bonus_rescue_threshold}s → +1 VIE
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

          {/* ── LETTER REVEAL ── */}
          {phase === "letter_reveal" && (
            <motion.div
              key="letter"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="relative min-h-[60vh] flex flex-col items-center justify-center space-y-8 text-center"
              style={{ background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.08) 0%, transparent 70%)" }}
            >
              <div className="absolute inset-0 scanline pointer-events-none opacity-10" />

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="relative z-10 space-y-2"
              >
                <p className="text-xs font-display tracking-[0.5em] text-primary/60">FRAGMENT DE CODE DÉCRYPTÉ</p>
                <div className="h-px w-24 bg-primary/30 mx-auto" />
              </motion.div>

              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 0.5, stiffness: 120 }}
                className="relative z-10"
              >
                <div
                  className="w-32 h-32 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "hsl(var(--primary) / 0.12)",
                    border: "2px solid hsl(var(--primary) / 0.5)",
                    boxShadow: "0 0 40px hsl(var(--primary) / 0.3), inset 0 0 20px hsl(var(--primary) / 0.05)",
                  }}
                >
                  <motion.span
                    className="text-6xl font-display font-bold"
                    style={{ color: "hsl(var(--primary))", textShadow: "0 0 30px hsl(var(--primary) / 0.6)" }}
                    animate={{ opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {earnedLetter}
                  </motion.span>
                </div>
                {[0, 72, 144, 216, 288].map((deg, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full"
                    style={{ background: "hsl(var(--primary))", top: "50%", left: "50%" }}
                    animate={{
                      x: [0, Math.cos((deg * Math.PI) / 180) * 70],
                      y: [0, Math.sin((deg * Math.PI) / 180) * 70],
                      opacity: [1, 0],
                      scale: [1.5, 0],
                    }}
                    transition={{ duration: 1.4, delay: 0.6 + i * 0.1, repeat: Infinity, repeatDelay: 2 }}
                  />
                ))}
              </motion.div>

              {narrativeText && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  className="relative z-10 max-w-sm"
                >
                  <p className="text-lg font-display font-bold leading-relaxed text-foreground">
                    "{narrativeText}"
                  </p>
                  <p className="text-xs text-muted-foreground font-display tracking-widest mt-2">— J. Valcourt</p>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="relative z-10"
              >
                <Button
                  onClick={() => setPhase("reward")}
                  className="font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-5"
                >
                  RÉCUPÉRER LE FRAGMENT →
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ── REWARD ── */}
          {phase === "reward" && data && (
            <motion.div
              key="reward"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="bg-card border border-primary/30 rounded-xl p-6 border-glow relative overflow-hidden text-center"
                style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.15)" }}
              >
                <div className="scanline absolute inset-0 pointer-events-none opacity-20" />
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-5xl mb-3 relative z-10"
                >
                  🧩
                </motion.div>
                 <p className="text-xs font-display tracking-[0.5em] text-primary/60 mb-1 relative z-10">FRAGMENT OBTENU</p>
                 <h2 className="text-2xl font-display font-bold text-primary relative z-10">
                   {data.reward?.fragment?.name ?? data.fragment_reward?.name ?? "Fragment Obtenu"}
                 </h2>
                 <p className="text-xs font-display tracking-widest text-muted-foreground mt-1 relative z-10">
                   TYPE : {data.reward?.fragment?.concept ?? data.fragment_reward?.concept}
                 </p>
               </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card border border-border rounded-lg p-5 flex items-center gap-4"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 font-display font-bold text-2xl"
                  style={{
                    background: "hsl(var(--primary) / 0.1)",
                    border: "1px solid hsl(var(--primary) / 0.4)",
                    color: "hsl(var(--primary))",
                  }}
                >
                  {earnedLetter}
                </div>
                <div>
                  <p className="text-xs font-display tracking-widest text-primary mb-0.5">LETTRE DU CODE OMEGA</p>
                  <p className="text-sm text-muted-foreground">
                    Collectez les 5 lettres pour déverrouiller le Protocole Ω.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="rounded-lg p-5 border text-sm italic text-center relative overflow-hidden"
                style={{
                  borderColor: "hsl(var(--primary) / 0.2)",
                  background: "hsl(var(--primary) / 0.04)",
                }}
              >
                <div className="scanline absolute inset-0 pointer-events-none opacity-10" />
                <p className="text-foreground leading-relaxed relative z-10">
                  "{data.reward?.jasper_quote ?? data.fragment_reward?.unlocked_message ?? ""}"
                </p>
                <p className="text-xs text-muted-foreground font-display tracking-widest mt-2 relative z-10">— J. Valcourt</p>
              </motion.div>

              {nextCountry && missionIndex < 5 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-card border border-border rounded-lg p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <p className="text-xs font-display text-primary tracking-wider">PROCHAINE DESTINATION</p>
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground tracking-wider mb-2">
                    {nextCountry.name.toUpperCase()}
                  </h3>
                  <p className="text-sm text-muted-foreground italic">
                    {data.reward?.next_destination_hint
                      ?? NEXT_COUNTRY_HINTS[country?.code ?? ""]
                      ?? "Le prochain nœud vous attend."}
                  </p>
                </motion.div>
              )}

              {missionIndex === 5 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="rounded-xl p-6 border text-center"
                  style={{
                    borderColor: "hsl(var(--primary) / 0.5)",
                    background: "hsl(var(--primary) / 0.08)",
                    boxShadow: "0 0 30px hsl(var(--primary) / 0.1)",
                  }}
                >
                  <p className="text-2xl mb-2">🌍</p>
                  <p className="text-xs font-display tracking-[0.4em] text-primary mb-2">SIGNAL INITIAL — COMPLÉTÉ</p>
                  <p className="text-sm text-muted-foreground">
                    Vous avez traversé les 5 nœuds fondateurs du système mondial. Le Protocole Oméga vous attend.
                  </p>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <Button
                  onClick={completeMission}
                  className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-base"
                >
                  <Puzzle className="h-5 w-5 mr-2" />
                  TERMINER LA MISSION
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ── FAILED ── */}
          {phase === "failed" && (
            <motion.div
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7 }}
              className="relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden rounded-xl"
              style={{ background: "linear-gradient(180deg, hsl(0 30% 5%) 0%, hsl(220 20% 4%) 100%)" }}
            >
              <div className="absolute inset-0 scanline pointer-events-none opacity-40" />
              <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ background: "radial-gradient(ellipse at center, transparent 40%, hsl(0 70% 15% / 0.6) 100%)" }}
              />

              <div className="relative z-10 space-y-6 px-6 text-center w-full max-w-sm mx-auto">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.3, stiffness: 150 }}
                >
                  <XCircle className="h-24 w-24 mx-auto" style={{ color: "hsl(0 70% 50%)" }} />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                  <p className="text-xs font-display tracking-[0.4em] mb-2" style={{ color: "hsl(0 65% 38%)" }}>VIES ÉPUISÉES</p>
                  <h2 className="text-4xl font-display font-bold tracking-wider mb-3" style={{ color: "hsl(0 65% 42%)", textShadow: "0 0 30px hsl(0 70% 30% / 0.5)" }}>
                    ÉCHEC
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: "hsl(0 0% 90%)" }}>
                    La décision stratégique était incorrecte.<br />
                    Jasper doit recommencer l'analyse depuis le début.
                  </p>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="text-xs italic leading-relaxed"
                  style={{ color: "hsl(0 0% 70%)" }}
                >
                  "Le Cercle ne pardonne pas les erreurs. Mais chaque échec est un enseignement."<br />
                  <span className="not-italic font-display tracking-widest text-[10px]">— J. Valcourt</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="flex flex-col gap-3"
                >
                  <Button
                    onClick={retryMission}
                    className="w-full font-display tracking-wider py-5 border-0"
                    style={{ background: "hsl(0 70% 35%)", color: "white" }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    REJOUER
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="w-full font-display tracking-wider py-5"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    RETOUR AU QG
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
};

// ── Timer Bar component ──────────────────────────────────────────────────────

function TimerBar({ timeLeft, total, timerPercent, timerColor }: { timeLeft: number; total: number; timerPercent: number; timerColor: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-end text-xs font-display">
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
  );
}

// ── Step Indicator component ─────────────────────────────────────────────────

function StepIndicator({ step, label, isCritical }: { step: 1 | 2 | 3; label: string; isCritical?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-bold flex-shrink-0"
        style={{
          background: isCritical ? "hsl(var(--primary) / 0.2)" : "hsl(var(--primary) / 0.1)",
          border: `1px solid hsl(var(--primary) / ${isCritical ? "0.6" : "0.3"})`,
          color: "hsl(var(--primary))",
        }}
      >
        {step}
      </div>
      <div className="flex-1 h-px bg-border" />
      <p className={`text-xs font-display tracking-[0.3em] ${isCritical ? "text-primary" : "text-muted-foreground"}`}>
        {label}
        {isCritical && <span className="ml-2 text-[10px] tracking-widest">⚡ CRITIQUE</span>}
      </p>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export default FreeMission;
