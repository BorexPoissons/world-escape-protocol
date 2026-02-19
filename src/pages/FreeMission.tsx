import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Home, CheckCircle, XCircle, RotateCcw, Puzzle,
  MapPin, ArrowRight, Zap, Shield
} from "lucide-react";
import TypewriterText from "@/components/TypewriterText";
import { checkAndAwardBadges } from "@/lib/badges";
import type { Tables } from "@/integrations/supabase/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FreeCountryData {
  country: { code: string; name_fr: string };
  mission: {
    mission_id: string;
    mission_title: string;
    phase: string;
    is_free: boolean;
    detective: string;
    intro: string;
  };
  question_bank: Array<{
    id: string;
    type: "A" | "B" | "C";
    question: string;
    choices: string[];
    answer_index: number;
    narrative_unlock?: string;
    hint_image?: { url: string; caption: string };
  }>;
  fragment_reward: {
    id: string;
    name: string;
    concept: string;
    unlocked_message: string;
  };
  next_country_hint?: string; // optional: narrative hint towards next country
}

type FreePhase =
  | "loading"
  | "intro"           // Scène immersive avec texte
  | "scene_choice"    // 3 choix (1 seul correct) — question Type A
  | "logic_puzzle"    // Énigme logique — résultat = une lettre (question Type B)
  | "strategic"       // Question stratégique finale (question Type C)
  | "letter_reveal"   // Révélation de la lettre obtenue
  | "reward"          // Fragment + citation + hint vers pays suivant
  | "failed";         // Échec

const SIGNAL_INITIAL_SEQUENCE = ["CH", "US", "CN", "BR", "IN"];

const NEXT_COUNTRY_HINTS: Record<string, string> = {
  CH: "Le flux a besoin d'un rythme. Cherchez où ce rythme est fixé.",
  US: "Celui qui construit les routes décide où passent les flux. Cap à l'Est.",
  CN: "La nature peut peser plus lourd que l'or. Le prochain nœud est dans l'hémisphère sud.",
  BR: "La masse devient puissance lorsqu'elle se connecte. Une civilisation de 1,4 milliard attend.",
  IN: "Tous les nœuds sont maintenant actifs. Le signal initial est complet.",
};

// Letters assigned to each free country (form a hidden word across the 5 missions)
const COUNTRY_LETTERS: Record<string, string> = {
  CH: "O",
  US: "M",
  CN: "E",
  BR: "G",
  IN: "A",
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

  // The 3 selected questions (one per step)
  const [sceneQuestion, setSceneQuestion] = useState<FreeCountryData["question_bank"][0] | null>(null);
  const [logicQuestion, setLogicQuestion] = useState<FreeCountryData["question_bank"][0] | null>(null);
  const [strategicQuestion, setStrategicQuestion] = useState<FreeCountryData["question_bank"][0] | null>(null);

  // Shuffled choices for each step
  const [sceneChoices, setSceneChoices] = useState<string[]>([]);
  const [logicChoices, setLogicChoices] = useState<string[]>([]);
  const [strategicChoices, setStrategicChoices] = useState<string[]>([]);

  // Answer state
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [sceneCorrect, setSceneCorrect] = useState(false);

  // The letter obtained
  const [earnedLetter, setEarnedLetter] = useState<string>("");

  // Narrative unlock text (from Type C correct answer)
  const [narrativeText, setNarrativeText] = useState<string>("");

  // Next country info
  const [nextCountry, setNextCountry] = useState<Tables<"countries"> | null>(null);

  // ── Load mission ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!countryId) return;
    loadFreeMission();
  }, [countryId]);

  const loadFreeMission = async () => {
    // Load country from DB
    const { data: countryData } = await supabase
      .from("countries")
      .select("*")
      .eq("id", countryId!)
      .single();

    if (!countryData) { navigate("/dashboard"); return; }
    setCountry(countryData);

    // Load next country in sequence
    const nextCode = getNextCode(countryData.code);
    if (nextCode) {
      const { data: nextData } = await supabase
        .from("countries")
        .select("*")
        .eq("code", nextCode)
        .single();
      if (nextData) setNextCountry(nextData);
    }

    // Load static JSON
    try {
      const res = await fetch(`/content/countries/${countryData.code}.json`);
      if (!res.ok) throw new Error("no static file");
      const json: FreeCountryData = await res.json();
      setData(json);

      // Draw questions: 1 Type A, 1 Type B, 1 Type C
      const typeA = shuffle(json.question_bank.filter(q => q.type === "A"));
      const typeB = shuffle(json.question_bank.filter(q => q.type === "B"));
      const typeC = shuffle(json.question_bank.filter(q => q.type === "C"));

      const sq = typeA[0] ?? null;
      const lq = typeB[0] ?? null;
      const stq = typeC[0] ?? null;

      setSceneQuestion(sq);
      setLogicQuestion(lq);
      setStrategicQuestion(stq);

      if (sq) setSceneChoices(shuffle([...sq.choices]));
      if (lq) setLogicChoices(shuffle([...lq.choices]));
      if (stq) setStrategicChoices(shuffle([...stq.choices]));

      setPhase("intro");
    } catch {
      // No static file — redirect to classic mission
      navigate(`/mission-classic/${countryId}`);
    }
  };

  function getNextCode(currentCode: string): string | null {
    const idx = SIGNAL_INITIAL_SEQUENCE.indexOf(currentCode);
    if (idx === -1 || idx === SIGNAL_INITIAL_SEQUENCE.length - 1) return null;
    return SIGNAL_INITIAL_SEQUENCE[idx + 1];
  }

  // ── Answer handlers ─────────────────────────────────────────────────────────

  const handleSceneAnswer = (choice: string) => {
    if (answerRevealed || !sceneQuestion) return;
    const correct = choice === sceneQuestion.choices[sceneQuestion.answer_index];
    setSelectedAnswer(choice);
    setAnswerRevealed(true);
    setSceneCorrect(correct);
  };

  const handleLogicAnswer = (choice: string) => {
    if (answerRevealed || !logicQuestion) return;
    const correct = choice === logicQuestion.choices[logicQuestion.answer_index];
    setSelectedAnswer(choice);
    setAnswerRevealed(true);
    if (!correct) {
      // Wrong logic answer → fail
      setTimeout(() => setPhase("failed"), 1200);
    }
  };

  const handleStrategicAnswer = (choice: string) => {
    if (answerRevealed || !strategicQuestion) return;
    const correct = choice === strategicQuestion.choices[strategicQuestion.answer_index];
    setSelectedAnswer(choice);
    setAnswerRevealed(true);

    if (correct && strategicQuestion.narrative_unlock) {
      setNarrativeText(strategicQuestion.narrative_unlock);
    }

    if (!correct) {
      // Wrong strategic answer → fail (it's the final critical question)
      setTimeout(() => setPhase("failed"), 1200);
    } else {
      // Reveal the letter
      const letter = country ? (COUNTRY_LETTERS[country.code] ?? "?") : "?";
      setEarnedLetter(letter);
      setTimeout(() => setPhase("letter_reveal"), 1000);
    }
  };

  // ── Complete mission ─────────────────────────────────────────────────────────

  const completeMission = async () => {
    if (!countryId || !data || !country) return;

    const timeElapsed = Math.round((Date.now() - missionStartTime) / 1000);
    const xpGained = 150; // fixed XP for free missions

    if (!user) {
      // Demo mode
      const prev = JSON.parse(localStorage.getItem("wep_demo_progress") || "{}");
      prev[countryId] = { score: 3, total: 3, time: timeElapsed, letter: earnedLetter };
      localStorage.setItem("wep_demo_progress", JSON.stringify(prev));
      toast({ title: "Mission accomplie! (Mode Démo)", description: `Lettre obtenue : ${earnedLetter} · Créez un compte pour sauvegarder.` });
      navigate(`/mission/${countryId}/complete?score=3&total=3&xp=${xpGained}&demo=1`);
      return;
    }

    // Save via RPC
    const { error: rpcError } = await (supabase as any).rpc("complete_country_attempt", {
      p_user_id: user.id,
      p_country_code: country.code,
      p_score: 3,
      p_total: 3,
    });

    if (rpcError) {
      console.error("complete_country_attempt error:", rpcError);
    }

    // Save mission record
    await supabase.from("missions").insert({
      user_id: user.id,
      country_id: countryId,
      mission_title: data.mission.mission_title,
      mission_data: { letter: earnedLetter, format: "free_v2" } as any,
      completed: true,
      score: 3,
      completed_at: new Date().toISOString(),
    });

    // Update XP + streak
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
      xp: newXp,
      level: newLevel,
      streak: newStreak,
      longest_streak: longestStreak,
      last_mission_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    // Badges
    const { count: missionCount } = await supabase
      .from("missions")
      .select("id", { count: "exact" })
      .eq("user_id", user.id)
      .eq("completed", true);

    checkAndAwardBadges({
      userId: user.id,
      score: 3,
      total: 3,
      timeElapsed,
      usedHint: false,
      ignoredFakeClue: true,
      missionCount: missionCount ?? 1,
      streak: newStreak,
      trustLevel: 50,
      suspicionLevel: 0,
      completedCountries: 1,
      xp: newXp,
    });

    toast({ title: "Mission accomplie !", description: `Lettre débloquée : ${earnedLetter} · +${xpGained} XP` });
    navigate(`/mission/${countryId}/complete?score=3&total=3&xp=${xpGained}&streak=${newStreak}`);
  };

  const retryMission = () => {
    setPhase("loading");
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setSceneCorrect(false);
    setEarnedLetter("");
    setNarrativeText("");
    loadFreeMission();
  };

  // ── Progression index (1-5) ──────────────────────────────────────────────────

  const missionIndex = country ? SIGNAL_INITIAL_SEQUENCE.indexOf(country.code) + 1 : 0;

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

              {/* Format info card */}
              <div className="bg-card border border-primary/20 rounded-lg p-4 grid grid-cols-3 gap-4 text-center text-xs font-display">
                <div>
                  <div className="text-2xl mb-1">🎭</div>
                  <p className="text-muted-foreground tracking-wider">SCÈNE<br />IMMERSIVE</p>
                </div>
                <div>
                  <div className="text-2xl mb-1">🔣</div>
                  <p className="text-muted-foreground tracking-wider">ÉNIGME<br />LOGIQUE</p>
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
                  text={data.mission.intro}
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

          {/* ── SCENE CHOICE ── */}
          {phase === "scene_choice" && sceneQuestion && (
            <motion.div
              key="scene"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              {/* Step indicator */}
              <StepIndicator step={1} label="SCÈNE IMMERSIVE" />

              {/* Scene narrative hint */}
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
                  } else if (isSelected) cls = "border-primary/50 bg-primary/5";

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

              {/* After answer feedback */}
              {answerRevealed && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className={`rounded-lg px-5 py-4 border text-sm font-display tracking-wider ${
                    sceneCorrect
                      ? "border-primary/40 bg-primary/8 text-primary"
                      : "border-muted-foreground/30 bg-muted/30 text-muted-foreground"
                  }`}>
                    {sceneCorrect
                      ? "✓ ANALYSE CORRECTE — Jasper confirme votre évaluation."
                      : "✗ ANALYSE INCORRECTE — Jasper note l'erreur mais continue la mission."}
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedAnswer(null);
                      setAnswerRevealed(false);
                      setPhase("logic_puzzle");
                    }}
                    className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    PASSER À L'ÉNIGME LOGIQUE →
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── LOGIC PUZZLE ── */}
          {phase === "logic_puzzle" && logicQuestion && (
            <motion.div
              key="logic"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <StepIndicator step={2} label="ÉNIGME LOGIQUE" />

              {/* Logic puzzle narrative */}
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
                  } else if (isSelected) cls = "border-primary/50 bg-primary/5";

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

              {answerRevealed && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Button
                    onClick={() => {
                      setSelectedAnswer(null);
                      setAnswerRevealed(false);
                      setPhase("strategic");
                    }}
                    className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    DÉCISION FINALE →
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── STRATEGIC QUESTION ── */}
          {phase === "strategic" && strategicQuestion && (
            <motion.div
              key="strategic"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <StepIndicator step={3} label="DÉCISION STRATÉGIQUE" isCritical />

              {/* Critical warning */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="rounded-lg px-5 py-4 border text-sm"
                style={{
                  borderColor: "hsl(var(--primary) / 0.5)",
                  background: "hsl(var(--primary) / 0.06)",
                }}
              >
                <p className="font-display tracking-wider text-primary text-xs mb-1">⚡ QUESTION CRITIQUE</p>
                <p className="text-muted-foreground">
                  Cette décision détermine si vous obtenez le fragment. Une erreur ici termine la mission.
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
                  } else if (isSelected) cls = "border-primary/50 bg-primary/5";

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

              {/* The big letter */}
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
                {/* Particles */}
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

              {/* Narrative unlock */}
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
              {/* Fragment card */}
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
                <h2 className="text-2xl font-display font-bold text-primary relative z-10">{data.fragment_reward.name}</h2>
                <p className="text-xs font-display tracking-widest text-muted-foreground mt-1 relative z-10">
                  TYPE : {data.fragment_reward.concept}
                </p>
              </motion.div>

              {/* Letter obtained */}
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

              {/* Citation */}
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
                  "{data.fragment_reward.unlocked_message}"
                </p>
                <p className="text-xs text-muted-foreground font-display tracking-widest mt-2 relative z-10">— J. Valcourt</p>
              </motion.div>

              {/* Next country hint */}
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
                    {NEXT_COUNTRY_HINTS[country?.code ?? ""] ?? "Le prochain nœud vous attend."}
                  </p>
                </motion.div>
              )}

              {/* Last mission complete message */}
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
                  <p className="text-xs font-display tracking-[0.4em] mb-2" style={{ color: "hsl(0 65% 38%)" }}>ANALYSE INCORRECTE</p>
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
