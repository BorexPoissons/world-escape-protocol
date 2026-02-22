import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Home, Heart, Clock, Zap, CheckCircle, XCircle,
  AlertTriangle, Shield, Trophy, RotateCcw, ArrowRight, Lock
} from "lucide-react";
import TypewriterText from "@/components/TypewriterText";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuestionOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  order: number;
  type: "mcq" | "text_input";
  category: string;
  prompt: string;
  options?: QuestionOption[];
  correct_answer: string;
  accepted_answers?: string[];
  feedback: { correct: string; wrong: string };
  media: { image_asset: string | null };
}

interface GameplayRules {
  timer_seconds: number;
  lives: number;
  gate_threshold: number;
  gate_total: number;
  bonus_seconds_exchange_rate: number;
}

interface MissionContent {
  meta: {
    code: string;
    country: string;
    season: number;
    order_index: number;
    operation_name: string;
    fragment_id: string;
  };
  story: {
    mission_title: string;
    intro: string;
    scenario: string;
    location_context: { city: string };
  };
  gameplay: {
    rules: GameplayRules;
    questions: Question[];
  };
  rewards: {
    fragment: { id: string; label: string; season_key: string };
    xp_mission_complete: number;
    token: { type: string; value: string };
    season_complete?: {
      key_name: string;
      key_label: string;
      final_minigame: { type: string; code: string; prompt: string; success_message: string };
    };
  };
  completion: {
    next_country: string | null;
    next_season?: number;
    success_message: string;
    failure_triggers_prison_break: boolean;
  };
  ui: {
    image_slots: Record<string, string | null>;
  };
}

type Phase = "loading" | "intro" | "quiz" | "answer_feedback" | "gate_success" | "gate_fail" | "rescue_offer" | "dead";

// ── Component ─────────────────────────────────────────────────────────────────

const SeasonMission = () => {
  const { countryCode } = useParams<{ countryCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [content, setContent] = useState<MissionContent | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");

  // Quiz state
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(120);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bonus seconds
  const [bonusSeconds, setBonusSeconds] = useState(0);

  // Country data
  const [countryName, setCountryName] = useState("");

  // ── Load mission ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!countryCode) return;
    loadMission();
  }, [countryCode]);

  const loadMission = async () => {
    const { data: missionRow } = await supabase
      .from("countries_missions")
      .select("content")
      .eq("code", countryCode!)
      .single();

    if (!missionRow?.content) {
      toast({ title: "Mission introuvable", variant: "destructive" });
      navigate("/dashboard");
      return;
    }

    const c = missionRow.content as unknown as MissionContent;
    setContent(c);
    setCountryName(c.meta.country);
    setLives(c.gameplay.rules.lives);
    setTimeLeft(c.gameplay.rules.timer_seconds);
    setPhase("intro");
  };

  // ── Timer ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "quiz" || answerRevealed) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, answerRevealed, currentQ]);

  const handleTimeout = useCallback(() => {
    if (!content) return;
    const q = content.gameplay.questions[currentQ];
    processAnswer(false, q.feedback.wrong);
  }, [content, currentQ, lives, bonusSeconds]);

  // ── Answer handling ───────────────────────────────────────────────────────

  const processAnswer = (correct: boolean, feedback: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCorrect(correct);
    setFeedbackText(feedback);
    setAnswerRevealed(true);

    if (correct) {
      setScore(prev => prev + 1);
      // Accumulate remaining time as bonus seconds
      setBonusSeconds(prev => prev + timeLeft);
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        // Check if rescue is possible
        const exchangeRate = content?.gameplay.rules.bonus_seconds_exchange_rate ?? 60;
        if (bonusSeconds >= exchangeRate) {
          setTimeout(() => setPhase("rescue_offer"), 1500);
          return;
        } else {
          setTimeout(() => setPhase("dead"), 1500);
          return;
        }
      }
    }
  };

  const handleMCQAnswer = (optionId: string) => {
    if (answerRevealed || !content) return;
    setSelectedAnswer(optionId);
    const q = content.gameplay.questions[currentQ];
    const correct = optionId === q.correct_answer;
    processAnswer(correct, correct ? q.feedback.correct : q.feedback.wrong);
  };

  const handleTextAnswer = () => {
    if (answerRevealed || !content) return;
    const q = content.gameplay.questions[currentQ];
    const accepted = q.accepted_answers ?? [q.correct_answer];
    const trimmed = textInput.trim();
    const correct = accepted.some(a => a.toLowerCase() === trimmed.toLowerCase());
    setSelectedAnswer(trimmed);
    processAnswer(correct, correct ? q.feedback.correct : q.feedback.wrong);
  };

  // ── Next question / gate check ────────────────────────────────────────────

  const nextQuestion = () => {
    if (!content) return;
    const questions = content.gameplay.questions;
    const nextIdx = currentQ + 1;

    if (nextIdx >= questions.length) {
      // All questions answered — check gate
      const finalScore = score; // score already updated
      const threshold = content.gameplay.rules.gate_threshold;
      if (finalScore >= threshold) {
        setPhase("gate_success");
      } else {
        setPhase("gate_fail");
      }
    } else {
      setCurrentQ(nextIdx);
      setSelectedAnswer(null);
      setTextInput("");
      setAnswerRevealed(false);
      setFeedbackText("");
      setTimeLeft(content.gameplay.rules.timer_seconds);
    }
  };

  // ── Bonus exchange ────────────────────────────────────────────────────────

  const exchangeBonusForLife = () => {
    if (!content) return;
    const rate = content.gameplay.rules.bonus_seconds_exchange_rate;
    if (bonusSeconds >= rate) {
      setBonusSeconds(prev => prev - rate);
      setLives(prev => prev + 1);
      toast({ title: "⚡ +1 Vie !", description: `${rate}s de bonus échangées.` });
    }
  };

  // ── Rescue from death ─────────────────────────────────────────────────────

  const handleRescue = () => {
    if (!content) return;
    const rate = content.gameplay.rules.bonus_seconds_exchange_rate;
    setBonusSeconds(prev => prev - rate);
    setLives(1);
    setSelectedAnswer(null);
    setTextInput("");
    setAnswerRevealed(false);
    setFeedbackText("");

    // Move to next question if possible
    const nextIdx = currentQ + 1;
    if (nextIdx < content.gameplay.questions.length) {
      setCurrentQ(nextIdx);
      setTimeLeft(content.gameplay.rules.timer_seconds);
      setPhase("quiz");
    } else {
      // Was on last question — check gate
      const threshold = content.gameplay.rules.gate_threshold;
      if (score >= threshold) {
        setPhase("gate_success");
      } else {
        setPhase("gate_fail");
      }
    }
  };

  // ── Complete mission (success) ────────────────────────────────────────────

  const completeMission = async () => {
    if (!content || !user) return;

    // Call RPC
    await (supabase as any).rpc("complete_country_attempt", {
      p_user_id: user.id,
      p_country_code: content.meta.code,
      p_score: score,
      p_total: content.gameplay.questions.length,
    });

    // Save token
    await supabase.from("user_tokens").insert({
      user_id: user.id,
      country_code: content.meta.code,
      letter: content.rewards.token.value,
    });

    // Update XP
    const xpGain = content.rewards.xp_mission_complete;
    const { data: prof } = await supabase.from("profiles").select("xp, level, streak, longest_streak").eq("user_id", user.id).single();
    if (prof) {
      const newXp = (prof as any).xp + xpGain;
      const newLevel = Math.floor(newXp / 200) + 1;
      const newStreak = ((prof as any).streak ?? 0) + 1;
      const longest = Math.max((prof as any).longest_streak ?? 0, newStreak);
      await (supabase.from("profiles") as any).update({
        xp: newXp, level: newLevel, streak: newStreak, longest_streak: longest,
        last_mission_at: new Date().toISOString(),
        bonus_seconds_banked: bonusSeconds,
        lives_banked: lives,
      }).eq("user_id", user.id);
    }

    // Save mission record
    const { data: countryRow } = await supabase.from("countries").select("id").eq("code", content.meta.code).single();
    if (countryRow) {
      await supabase.from("missions").insert({
        user_id: user.id,
        country_id: countryRow.id,
        mission_title: content.story.mission_title,
        completed: true,
        score,
        completed_at: new Date().toISOString(),
      });
    }

    toast({ title: "Mission accomplie !", description: content.completion.success_message });

    // Navigate to next
    if (content.completion.next_country) {
      navigate(`/season-mission/${content.completion.next_country}`);
    } else if (content.meta.season === 1) {
      navigate("/season1-complete");
    } else {
      navigate("/puzzle");
    }
  };

  // ── Retry ─────────────────────────────────────────────────────────────────

  const retry = () => {
    if (!content) return;
    setPhase("loading");
    setCurrentQ(0);
    setScore(0);
    setLives(content.gameplay.rules.lives);
    setSelectedAnswer(null);
    setTextInput("");
    setAnswerRevealed(false);
    setFeedbackText("");
    setBonusSeconds(0);
    setTimeLeft(content.gameplay.rules.timer_seconds);
    setTimeout(() => setPhase("intro"), 100);
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  if (phase === "loading" || !content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-16 h-16 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-primary font-display tracking-widest animate-pulse">CHARGEMENT DE LA MISSION...</p>
        </motion.div>
      </div>
    );
  }

  const rules = content.gameplay.rules;
  const questions = content.gameplay.questions;
  const question = questions[currentQ];
  const timerPercent = (timeLeft / rules.timer_seconds) * 100;
  const timerColor = timerPercent > 50 ? "bg-primary" : timerPercent > 25 ? "bg-yellow-500" : "bg-destructive";
  const canExchange = bonusSeconds >= rules.bonus_seconds_exchange_rate;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
              <Home className="h-4 w-4" />
            </Link>
            <span className="text-border">|</span>
            <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="text-sm font-display text-primary tracking-wider truncate text-center flex-1">
            {content.story.mission_title} — {countryName.toUpperCase()}
          </div>

          {/* Lives + Score + Bonus */}
          {phase === "quiz" && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: rules.lives }).map((_, i) => (
                  <Heart key={i} className={`h-4 w-4 ${i < lives ? "text-destructive fill-destructive" : "text-muted"}`} />
                ))}
              </div>
              <span className="text-xs font-display text-muted-foreground">{currentQ + 1}/{questions.length}</span>
              <span className="text-xs font-display text-primary">✓ {score}</span>
              {bonusSeconds > 0 && (
                <span className="text-xs font-display text-yellow-500 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> {bonusSeconds}s
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">

          {/* ── INTRO ── */}
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-xs font-display text-primary tracking-wider">
                  SAISON {content.meta.season} — PAYS {content.meta.order_index}/12
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-display font-bold text-primary tracking-wider">
                {content.story.mission_title}
              </h1>

              <p className="text-sm text-muted-foreground font-display tracking-wider">
                {content.story.location_context.city.toUpperCase()} · {content.meta.fragment_id}
              </p>

              <div className="bg-card border border-border rounded-xl p-6 text-left">
                <TypewriterText text={content.story.intro} className="text-foreground leading-relaxed whitespace-pre-line" speed={30} />
              </div>

              {content.story.scenario && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="bg-card/50 border border-border/50 rounded-lg p-4 text-left">
                  <p className="text-sm text-muted-foreground italic">{content.story.scenario}</p>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="space-y-3">
                {/* Rules reminder */}
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground font-display">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {rules.timer_seconds}s</span>
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {rules.lives} vies</span>
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {rules.gate_threshold}/{rules.gate_total}</span>
                </div>

                <Button
                  onClick={() => { setPhase("quiz"); setTimeLeft(rules.timer_seconds); }}
                  className="w-full py-6 font-display tracking-wider text-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  COMMENCER LE QUIZ
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* ── QUIZ ── */}
          {phase === "quiz" && question && (
            <motion.div key={`q-${currentQ}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
              {/* Timer bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground font-display">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeLeft}s</span>
                  <span className="uppercase tracking-wider text-[10px]">{question.category}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${timerColor} transition-colors`}
                    style={{ width: `${timerPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Exchange bonus button */}
              {canExchange && lives < rules.lives && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={exchangeBonusForLife}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-500 text-xs font-display tracking-wider hover:bg-yellow-500/20 transition-colors"
                >
                  <Zap className="h-3.5 w-3.5" />
                  ÉCHANGER {rules.bonus_seconds_exchange_rate}s → +1 VIE
                  <span className="text-yellow-500/60">({bonusSeconds}s dispo)</span>
                </motion.button>
              )}

              {/* Question */}
              <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-xs text-primary font-display tracking-wider mb-3">
                  QUESTION {currentQ + 1}/{questions.length}
                </p>
                <p className="text-lg font-medium text-foreground leading-relaxed">
                  {question.prompt}
                </p>
              </div>

              {/* Answer options */}
              {question.type === "mcq" && question.options && (
                <div className="grid gap-3">
                  {question.options.map(opt => {
                    let style = "border-border hover:border-primary/50 hover:bg-primary/5";
                    if (answerRevealed) {
                      if (opt.id === question.correct_answer) {
                        style = "border-primary bg-primary/10";
                      } else if (opt.id === selectedAnswer && !isCorrect) {
                        style = "border-destructive bg-destructive/10";
                      } else {
                        style = "border-border opacity-50";
                      }
                    } else if (opt.id === selectedAnswer) {
                      style = "border-primary bg-primary/10";
                    }

                    return (
                      <motion.button
                        key={opt.id}
                        onClick={() => handleMCQAnswer(opt.id)}
                        disabled={answerRevealed}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${style}`}
                        whileHover={!answerRevealed ? { scale: 1.01 } : {}}
                        whileTap={!answerRevealed ? { scale: 0.99 } : {}}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full border border-current flex items-center justify-center text-xs font-display font-bold shrink-0">
                            {opt.id}
                          </span>
                          <span className="text-sm">{opt.text}</span>
                          {answerRevealed && opt.id === question.correct_answer && (
                            <CheckCircle className="h-5 w-5 text-primary ml-auto shrink-0" />
                          )}
                          {answerRevealed && opt.id === selectedAnswer && !isCorrect && (
                            <XCircle className="h-5 w-5 text-destructive ml-auto shrink-0" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Text input question */}
              {question.type === "text_input" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={textInput}
                      onChange={e => setTextInput(e.target.value)}
                      placeholder="Votre réponse..."
                      disabled={answerRevealed}
                      className="flex-1 font-display"
                      onKeyDown={e => e.key === "Enter" && !answerRevealed && handleTextAnswer()}
                    />
                    <Button onClick={handleTextAnswer} disabled={answerRevealed || !textInput.trim()} className="font-display">
                      VALIDER
                    </Button>
                  </div>
                  {answerRevealed && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${isCorrect ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                      {isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      <span className="text-sm">Réponse attendue : <strong>{question.correct_answer}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback + next */}
              {answerRevealed && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className={`p-4 rounded-lg border ${isCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                    <p className="text-sm text-muted-foreground">{feedbackText}</p>
                  </div>
                  <Button onClick={nextQuestion} className="w-full py-5 font-display tracking-wider">
                    {currentQ + 1 < questions.length ? "QUESTION SUIVANTE" : "VOIR LE RÉSULTAT"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── GATE SUCCESS ── */}
          {phase === "gate_success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
                <Trophy className="h-20 w-20 text-primary mx-auto" />
              </motion.div>
              <h1 className="text-3xl font-display font-bold text-primary tracking-wider">
                ACCÈS AUTORISÉ
              </h1>
              <p className="text-muted-foreground">
                Score : {score}/{questions.length} — Le Protocole accepte votre progression.
              </p>
              <div className="bg-card border border-primary/30 rounded-xl p-6 border-glow">
                <p className="text-xs text-primary font-display tracking-wider mb-2">FRAGMENT OBTENU</p>
                <p className="text-2xl font-display font-bold text-foreground">{content.rewards.fragment.label}</p>
                <p className="text-sm text-muted-foreground mt-1">{content.completion.success_message}</p>
              </div>
              {bonusSeconds > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-yellow-500 font-display">
                  <Zap className="h-4 w-4" /> {bonusSeconds}s bonus accumulées
                </div>
              )}
              {lives > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-display">
                  <Heart className="h-4 w-4 text-destructive" /> {lives} vie{lives > 1 ? "s" : ""} restante{lives > 1 ? "s" : ""} → banquées pour la suite
                </div>
              )}
              <Button onClick={completeMission} className="w-full py-6 font-display tracking-wider text-lg bg-primary text-primary-foreground">
                {content.completion.next_country ? "PAYS SUIVANT" : "TERMINER LA SAISON"}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* ── GATE FAIL ── */}
          {phase === "gate_fail" && (
            <motion.div key="fail" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                <Lock className="h-20 w-20 text-destructive mx-auto" />
              </motion.div>
              <h1 className="text-3xl font-display font-bold text-destructive tracking-wider">
                ACCÈS REFUSÉ
              </h1>
              <p className="text-muted-foreground">
                Score : {score}/{questions.length} — Minimum requis : {rules.gate_threshold}/{rules.gate_total}
              </p>
              <p className="text-sm text-muted-foreground">
                Le Protocole ne vous accepte pas. Vous devez passer par le mini-jeu de récupération.
              </p>
              <div className="flex gap-3">
                <Button onClick={retry} variant="outline" className="flex-1 py-5 font-display tracking-wider">
                  <RotateCcw className="h-4 w-4 mr-2" /> RÉESSAYER
                </Button>
                <Button onClick={() => navigate("/prison-break/" + countryCode)} className="flex-1 py-5 font-display tracking-wider bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  <AlertTriangle className="h-4 w-4 mr-2" /> PRISON BREAK
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── RESCUE OFFER ── */}
          {phase === "rescue_offer" && (
            <motion.div key="rescue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-center">
              <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
              <h2 className="text-2xl font-display font-bold text-foreground tracking-wider">
                VIES ÉPUISÉES
              </h2>
              <p className="text-muted-foreground">
                Vous avez <strong className="text-yellow-500">{bonusSeconds}s</strong> de bonus accumulées.
              </p>
              <div className="flex gap-3">
                <Button onClick={handleRescue} className="flex-1 py-5 font-display tracking-wider bg-yellow-500 text-black hover:bg-yellow-400">
                  <Zap className="h-4 w-4 mr-2" /> ÉCHANGER {rules.bonus_seconds_exchange_rate}s → +1 VIE
                </Button>
                <Button onClick={() => setPhase("dead")} variant="outline" className="flex-1 py-5 font-display tracking-wider">
                  ABANDONNER
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── DEAD ── */}
          {phase === "dead" && (
            <motion.div key="dead" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 text-center">
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
              <h2 className="text-2xl font-display font-bold text-destructive tracking-wider">
                MISSION ÉCHOUÉE
              </h2>
              <p className="text-muted-foreground">Score : {score}/{questions.length}</p>
              <div className="flex gap-3">
                <Button onClick={retry} className="flex-1 py-5 font-display tracking-wider">
                  <RotateCcw className="h-4 w-4 mr-2" /> RÉESSAYER
                </Button>
                <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1 py-5 font-display tracking-wider">
                  <Home className="h-4 w-4 mr-2" /> TABLEAU DE BORD
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
};

export default SeasonMission;
