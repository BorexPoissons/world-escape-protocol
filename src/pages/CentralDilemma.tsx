import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, ChevronRight, Lock } from "lucide-react";

// ── Calcul steps to derive SWISS ──────────────────────────────────────────────
const CALCUL_STEPS = [
  {
    letter: "S",
    code: 19,
    expression: "(4 + 5) × 2 + 1",
    result: "= 19",
    explanation: "19 → S",
  },
  {
    letter: "W",
    code: 23,
    expression: "(6 × 3) + 5",
    result: "= 23",
    explanation: "23 → W",
  },
  {
    letter: "I",
    code: 9,
    expression: "(12 ÷ 3) + 5",
    result: "= 9",
    explanation: "9 → I",
  },
  {
    letter: "S",
    code: 19,
    expression: "(7 + 2) × 2 + 1",
    result: "= 19",
    explanation: "19 → S",
  },
  {
    letter: "S",
    code: 19,
    expression: "(10 − 1) × 2 + 1",
    result: "= 19",
    explanation: "19 → S",
  },
];

// Five free countries and their approximate positions for the convergence animation
// positions are percentage-based (left, top) within the container
const COUNTRY_NODES = [
  { code: "CH", label: "SUISSE",      x: 52,  y: 28 },
  { code: "US", label: "ÉTATS-UNIS",  x: 20,  y: 35 },
  { code: "CN", label: "CHINE",       x: 74,  y: 32 },
  { code: "BR", label: "BRÉSIL",      x: 30,  y: 68 },
  { code: "IN", label: "INDE",        x: 65,  y: 52 },
];

// CH center (convergence target)
const CENTER_NODE = COUNTRY_NODES[0]; // CH

type Phase =
  | "intro"
  | "input"
  | "calcul"
  | "success"
  | "animation";

const CentralDilemma: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("intro");
  const [inputValue, setInputValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [calculStep, setCalculStep] = useState(0); // 0 = not started, 1-5 = reveal steps
  const [showError, setShowError] = useState(false);
  const [revealedLetters, setRevealedLetters] = useState<string[]>([]);
  const [animationStage, setAnimationStage] = useState(0); // 0-5 for post-validation animation
  const [validated, setValidated] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load persisted state
  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("user_story_state")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        const d = data as any;
        if (d.central_word_validated) {
          setValidated(true);
          setPhase("success");
        }
        setAttempts(d.central_word_attempts ?? 0);
        const step = d.central_calcul_step ?? 0;
        setCalculStep(step);
        if (step > 0) {
          setRevealedLetters(CALCUL_STEPS.slice(0, step).map(s => s.letter));
          if (step === 5) {
            setInputValue("SWISS");
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Persist state helper
  const persistState = async (patch: Record<string, unknown>) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from("user_story_state")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (existing) {
      await (supabase as any)
        .from("user_story_state")
        .update(patch)
        .eq("user_id", user.id);
    } else {
      await (supabase as any)
        .from("user_story_state")
        .insert({ user_id: user.id, ...patch });
    }
  };

  // Unlock the dilemma (called when entering the page)
  useEffect(() => {
    if (!user || loading) return;
    persistState({ central_dilemma_unlocked: true });
  }, [user, loading]);

  const handleValidate = async () => {
    const clean = inputValue.trim().toUpperCase();
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    await persistState({ central_word_attempts: newAttempts });

    if (clean === "SWISS") {
      // Success — start animation
      await persistState({ central_word_validated: true, central_word_attempts: newAttempts });
      setValidated(true);
      setPhase("animation");
      // Drive animation stages
      let stage = 0;
      const interval = setInterval(() => {
        stage++;
        setAnimationStage(stage);
        if (stage >= 5) {
          clearInterval(interval);
          setTimeout(() => setPhase("success"), 1200);
        }
      }, 1400);
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
    }
  };

  const handleCalculStep = async () => {
    if (calculStep >= 5) return;
    const next = calculStep + 1;
    setCalculStep(next);
    setRevealedLetters(prev => [...prev, CALCUL_STEPS[next - 1].letter]);
    await persistState({ central_calcul_step: next });
    if (next === 5) {
      // Auto-fill input
      setTimeout(() => {
        setInputValue("SWISS");
        setPhase("input");
        inputRef.current?.focus();
      }, 800);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary font-display animate-pulse text-xl tracking-widest">CHARGEMENT...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-display text-sm text-primary tracking-widest">W.E.P. — DILEMME CENTRAL</span>
          </div>
          <span className="text-xs text-muted-foreground font-display tracking-wider">
            GLOBAL_REVEAL_S1_STEP1
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">

            {/* ── Intro phase ── */}
            {phase === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="space-y-8 text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="text-primary text-6xl mb-2"
                >
                  ◈
                </motion.div>

                <div>
                  <p className="text-xs font-display tracking-[0.4em] text-primary/60 mb-3">SIGNAL INITIAL — PHASE TERMINÉE</p>
                  <h1 className="text-4xl font-display font-bold text-primary text-glow tracking-wider mb-6">
                    DILEMME CENTRAL
                  </h1>
                </div>

                <div
                  className="bg-card border border-border rounded-xl p-8 space-y-4 text-left border-glow"
                  style={{ boxShadow: "0 0 40px hsl(40 80% 55% / 0.08)" }}
                >
                  <p className="text-foreground leading-relaxed">
                    Tu as identifié cinq leviers.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {["CH — Flux", "US — Rythme", "CN — Réseau", "BR — Ressource", "IN — Masse"].map((item, i) => (
                      <motion.div
                        key={item}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.12 }}
                        className="flex items-center gap-3 text-sm font-display tracking-wider text-muted-foreground"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                        {item}
                      </motion.div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-4 mt-4">
                    <p className="text-foreground leading-relaxed">
                      Mais tout système a une origine.
                    </p>
                    <p className="text-foreground leading-relaxed mt-2">
                      Si tu as compris la structure…<br />
                      <span className="text-primary font-display tracking-wider">Trouve le nom du point central.</span>
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => setPhase("input")}
                  className="w-full font-display tracking-wider py-6 bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                >
                  ACCEPTER LE DÉFI
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* ── Input phase ── */}
            {phase === "input" && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <p className="text-xs font-display tracking-[0.4em] text-primary/60 mb-2">DILEMME CENTRAL</p>
                  <h2 className="text-2xl font-display font-bold text-primary tracking-wider">
                    Identifiez le point d'origine
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">5 lettres · Insensible à la casse</p>
                </div>

                {/* Revealed letters from calcul mode */}
                {revealedLetters.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-center gap-3"
                  >
                    {revealedLetters.map((letter, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="w-12 h-12 bg-primary/10 border border-primary/50 rounded-lg flex items-center justify-center font-display font-bold text-xl text-primary"
                        style={{ boxShadow: "0 0 12px hsl(40 80% 55% / 0.2)" }}
                      >
                        {letter}
                      </motion.div>
                    ))}
                    {/* Empty slots */}
                    {Array.from({ length: 5 - revealedLetters.length }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="w-12 h-12 bg-muted/30 border border-border rounded-lg flex items-center justify-center text-muted-foreground/30 font-display text-xl"
                      >
                        ?
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Input */}
                <div className="space-y-3">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value.toUpperCase().slice(0, 5))}
                    onKeyDown={e => e.key === "Enter" && handleValidate()}
                    placeholder="_ _ _ _ _"
                    maxLength={5}
                    className="text-center text-2xl font-display tracking-[0.5em] h-16 bg-card border-border focus-visible:ring-primary/50 text-primary"
                    style={{ letterSpacing: "0.5em" }}
                    autoFocus
                  />

                  <AnimatePresence>
                    {showError && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-destructive font-display tracking-wider text-center"
                      >
                        ✗ Réponse incorrecte — Tentative {attempts} enregistrée
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <Button
                    onClick={handleValidate}
                    disabled={inputValue.length !== 5}
                    className="w-full font-display tracking-wider py-6 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                  >
                    VALIDER
                  </Button>
                </div>

                {/* Hint button */}
                <div className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => setPhase("calcul")}
                    className="text-muted-foreground hover:text-primary font-display tracking-wider text-xs gap-2"
                  >
                    <Lock className="h-3 w-3" />
                    INDICE — Mode calcul
                  </Button>
                </div>

                {attempts > 0 && (
                  <p className="text-xs text-muted-foreground text-center font-display tracking-wider">
                    Tentatives : {attempts} · Aucune pénalité · Réessaye autant que nécessaire
                  </p>
                )}
              </motion.div>
            )}

            {/* ── Calcul phase ── */}
            {phase === "calcul" && (
              <motion.div
                key="calcul"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <p className="text-xs font-display tracking-[0.4em] text-primary/60 mb-2">MODE CALCUL</p>
                  <h2 className="text-2xl font-display font-bold text-primary tracking-wider">
                    Déchiffrez les 5 lettres
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Chaque résultat correspond à une lettre par sa position dans l'alphabet étendu
                  </p>
                </div>

                {/* Step cards */}
                <div className="space-y-3">
                  {CALCUL_STEPS.map((step, i) => {
                    const revealed = i < calculStep;
                    return (
                      <AnimatePresence key={i}>
                        {revealed && (
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="bg-card border border-primary/20 rounded-xl p-4 flex items-center justify-between border-glow"
                          >
                            <div>
                              <p className="text-xs text-muted-foreground font-display tracking-wider mb-1">
                                CALCUL {i + 1}
                              </p>
                              <p className="font-display text-foreground">{step.expression} {step.result}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground font-display">{step.explanation}</p>
                              <p className="text-3xl font-display font-bold text-primary">{step.letter}</p>
                            </div>
                          </motion.div>
                        )}
                        {!revealed && i === calculStep && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-muted/20 border border-border rounded-xl p-4 flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs text-muted-foreground font-display tracking-wider mb-1">
                                CALCUL {i + 1}
                              </p>
                              <p className="font-display text-muted-foreground/40">• • • • •</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={handleCalculStep}
                              className="font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                            >
                              RÉVÉLER
                            </Button>
                          </motion.div>
                        )}
                        {!revealed && i > calculStep && (
                          <div className="bg-muted/10 border border-border/50 rounded-xl p-4 flex items-center justify-between opacity-30">
                            <p className="text-xs text-muted-foreground font-display tracking-wider">CALCUL {i + 1} — VERROUILLÉ</p>
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </AnimatePresence>
                    );
                  })}
                </div>

                {/* Letters assembled so far */}
                {calculStep > 0 && (
                  <div className="flex justify-center gap-2">
                    {CALCUL_STEPS.map((step, i) => (
                      <div
                        key={i}
                        className={`w-10 h-10 border rounded-lg flex items-center justify-center font-display font-bold text-lg transition-all duration-300 ${
                          i < calculStep
                            ? "bg-primary/10 border-primary/50 text-primary"
                            : "bg-muted/20 border-border text-muted-foreground/30"
                        }`}
                      >
                        {i < calculStep ? step.letter : "?"}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setPhase("input")}
                    className="flex-1 font-display tracking-wider border-primary/30 text-primary hover:bg-primary/10"
                  >
                    ← SAISIE DIRECTE
                  </Button>
                  {calculStep === 5 && (
                    <Button
                      onClick={() => { setInputValue("SWISS"); setPhase("input"); }}
                      className="flex-1 font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      VALIDER LE MOT →
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Animation phase (convergence) ── */}
            {phase === "animation" && (
              <motion.div
                key="animation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 text-center"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-primary font-display tracking-[0.4em] text-sm mb-4">MOT VALIDÉ</p>
                  <div className="flex justify-center gap-3 mb-6">
                    {"SWISS".split("").map((letter, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: -20, scale: 0.5 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: i * 0.12, type: "spring", stiffness: 300 }}
                        className="w-14 h-14 bg-primary/20 border-2 border-primary rounded-xl flex items-center justify-center font-display font-bold text-2xl text-primary"
                        style={{ boxShadow: "0 0 20px hsl(40 80% 55% / 0.4)" }}
                      >
                        {letter}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* SVG Convergence Map */}
                <div className="relative w-full" style={{ paddingBottom: "55%", background: "hsl(220 20% 4%)", borderRadius: "1rem", overflow: "hidden", border: "1px solid hsl(40 80% 55% / 0.2)" }}>
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 100 55"
                    style={{ overflow: "visible" }}
                  >
                    {/* Lines from each country to CH */}
                    {COUNTRY_NODES.filter(n => n.code !== "CH").map((node, i) => (
                      <motion.line
                        key={node.code}
                        x1={node.x}
                        y1={node.y}
                        x2={CENTER_NODE.x}
                        y2={CENTER_NODE.y}
                        stroke="hsl(40 80% 55%)"
                        strokeWidth="0.4"
                        strokeDasharray="2 1"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={animationStage >= 2 ? { pathLength: 1, opacity: 0.7 } : { pathLength: 0, opacity: 0 }}
                        transition={{ duration: 1.2, delay: i * 0.2 }}
                      />
                    ))}

                    {/* Country nodes */}
                    {COUNTRY_NODES.map((node, i) => (
                      <g key={node.code}>
                        <motion.circle
                          cx={node.x}
                          cy={node.y}
                          r={node.code === "CH" ? 2.5 : 1.8}
                          fill={node.code === "CH" ? "hsl(40 80% 55%)" : "hsl(40 60% 45%)"}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={animationStage >= 1 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                          transition={{ delay: i * 0.15, type: "spring" }}
                          style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                        />
                        <motion.text
                          x={node.x}
                          y={node.y - 3.5}
                          textAnchor="middle"
                          fontSize="2.5"
                          fill="hsl(40 80% 55%)"
                          fontFamily="monospace"
                          initial={{ opacity: 0 }}
                          animate={animationStage >= 1 ? { opacity: 1 } : { opacity: 0 }}
                          transition={{ delay: i * 0.15 + 0.3 }}
                        >
                          {node.code}
                        </motion.text>
                      </g>
                    ))}

                    {/* Pentagon around CH */}
                    {animationStage >= 3 && (
                      <motion.polygon
                        points={[
                          `${CENTER_NODE.x},${CENTER_NODE.y - 8}`,
                          `${CENTER_NODE.x + 7.6},${CENTER_NODE.y - 2.5}`,
                          `${CENTER_NODE.x + 4.7},${CENTER_NODE.y + 6.5}`,
                          `${CENTER_NODE.x - 4.7},${CENTER_NODE.y + 6.5}`,
                          `${CENTER_NODE.x - 7.6},${CENTER_NODE.y - 2.5}`,
                        ].join(" ")}
                        fill="none"
                        stroke="hsl(40 80% 55%)"
                        strokeWidth="0.3"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 0.5, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        style={{ transformOrigin: `${CENTER_NODE.x}px ${CENTER_NODE.y}px` }}
                      />
                    )}

                    {/* Pulsing center */}
                    {animationStage >= 4 && (
                      <>
                        <motion.circle
                          cx={CENTER_NODE.x}
                          cy={CENTER_NODE.y}
                          r="4"
                          fill="none"
                          stroke="hsl(40 80% 55%)"
                          strokeWidth="0.3"
                          animate={{ r: [4, 7, 4], opacity: [0.6, 0, 0.6] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        />
                        <motion.circle
                          cx={CENTER_NODE.x}
                          cy={CENTER_NODE.y}
                          r="2.5"
                          fill="hsl(40 80% 55%)"
                          animate={{ opacity: [0.8, 1, 0.8] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        />
                      </>
                    )}
                  </svg>
                </div>

                {/* Progressive messages */}
                <AnimatePresence>
                  {animationStage >= 1 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-muted-foreground font-display tracking-wider"
                    >
                      Les 5 pays s'illuminent…
                    </motion.p>
                  )}
                  {animationStage >= 2 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-primary font-display tracking-wider"
                    >
                      Les connexions convergent vers la Suisse…
                    </motion.p>
                  )}
                  {animationStage >= 4 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-primary font-display tracking-wider text-glow"
                    >
                      Centre géométrique activé.
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── Success phase ── */}
            {phase === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
                className="space-y-8 text-center"
              >
                {/* Pulsing Omega symbol */}
                <motion.div
                  animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                  className="text-7xl text-primary text-glow"
                >
                  Ω
                </motion.div>

                <div>
                  <p className="text-xs font-display tracking-[0.4em] text-primary/60 mb-3">DILEMME RÉSOLU</p>
                  <h1 className="text-3xl font-display font-bold text-primary text-glow tracking-wider mb-4">
                    Tu as compris avant le calcul.
                  </h1>
                  <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
                    Le système commence là où il semble neutre.
                  </p>
                </div>

                {/* Final message card */}
                <div
                  className="bg-card border border-primary/20 rounded-xl p-8 space-y-4 border-glow"
                  style={{ boxShadow: "0 0 40px hsl(40 80% 55% / 0.1)" }}
                >
                  <div className="scanline absolute inset-0 pointer-events-none opacity-10 rounded-xl" />
                  <p className="text-foreground leading-relaxed">
                    Le système ne commence pas dans la puissance.
                  </p>
                  <p className="text-foreground leading-relaxed">
                    Il commence dans la <span className="text-primary font-display tracking-wider">neutralité</span>.
                  </p>
                  <div className="border-t border-border/50 pt-4">
                    <div className="flex items-center justify-center gap-3">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                      <p className="font-display tracking-[0.3em] text-muted-foreground text-sm">
                        PROTOCOLE OMEGA : VERROUILLÉ
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-2 font-display tracking-wider">
                      Déverrouillez le Protocole Ω pour continuer l'enquête
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => navigate("/dashboard")}
                    className="w-full font-display tracking-wider py-6 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    RETOUR AU QG
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/puzzle")}
                    className="w-full font-display tracking-wider border-primary/30 text-primary hover:bg-primary/10"
                  >
                    PUZZLE MONDIAL
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default CentralDilemma;
