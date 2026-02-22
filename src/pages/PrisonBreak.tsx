import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Lock, Unlock, RotateCcw, ArrowRight, AlertTriangle, Clock,
  Eye, EyeOff, CheckCircle, XCircle, Shuffle
} from "lucide-react";

// ── Template types ────────────────────────────────────────────────────────────

type TemplateType = "code4" | "math_seq" | "grid3x3" | "anagram" | "clock";

interface PuzzleState {
  type: TemplateType;
  prompt: string;
  answer: string;
  extra: Record<string, any>;
}

// ── Generators ────────────────────────────────────────────────────────────────

const TEMPLATES: TemplateType[] = ["code4", "math_seq", "grid3x3", "anagram", "clock"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCode4(): PuzzleState {
  const code = String(randInt(1000, 9999));
  return {
    type: "code4",
    prompt: "Mémorisez le code, il disparaîtra dans 3 secondes.",
    answer: code,
    extra: { code, showTime: 3 },
  };
}

function generateMathSeq(): PuzzleState {
  const variant = randInt(0, 2);
  let seq: number[];
  let answer: number;

  if (variant === 0) {
    // arithmetic
    const start = randInt(2, 20);
    const step = randInt(2, 7);
    seq = Array.from({ length: 5 }, (_, i) => start + step * i);
    answer = start + step * 5;
  } else if (variant === 1) {
    // geometric
    const start = randInt(2, 5);
    const ratio = randInt(2, 3);
    seq = Array.from({ length: 5 }, (_, i) => start * Math.pow(ratio, i));
    answer = start * Math.pow(ratio, 5);
  } else {
    // fibonacci-like
    const a = randInt(1, 5);
    const b = randInt(1, 5);
    seq = [a, b];
    for (let i = 2; i < 5; i++) seq.push(seq[i - 1] + seq[i - 2]);
    answer = seq[3] + seq[4];
  }

  return {
    type: "math_seq",
    prompt: `Trouvez le nombre suivant : ${seq.join(", ")}, ?`,
    answer: String(answer),
    extra: { seq },
  };
}

function generateGrid3x3(): PuzzleState {
  // Generate a random order of 5 cells to light up
  const count = randInt(4, 6);
  const allCells = Array.from({ length: 9 }, (_, i) => i);
  const sequence = shuffleArray(allCells).slice(0, count);
  return {
    type: "grid3x3",
    prompt: `Reproduisez la séquence de ${count} cases dans l'ordre.`,
    answer: sequence.join(","),
    extra: { sequence, count },
  };
}

function generateAnagram(): PuzzleState {
  const words = [
    "PRISON", "ÉVASION", "LIBERTÉ", "CIPHER", "SECRET",
    "ENIGME", "PUZZLE", "SIGNAL", "ALARME", "VERROU",
    "COFFRE", "TUNNEL", "OMBRE", "ORACLE", "REFUGE",
    "PIRATE", "MATRICE", "FILTRE", "INDICE", "MASQUE",
  ];
  const word = pickRandom(words);
  let scrambled = shuffleArray(word.split("")).join("");
  // Ensure it's actually scrambled
  let tries = 0;
  while (scrambled === word && tries < 10) {
    scrambled = shuffleArray(word.split("")).join("");
    tries++;
  }
  return {
    type: "anagram",
    prompt: `Remettez les lettres dans l'ordre :`,
    answer: word,
    extra: { scrambled },
  };
}

function generateClock(): PuzzleState {
  const hour = randInt(1, 12);
  const minuteOptions = [0, 15, 30, 45];
  const minute = pickRandom(minuteOptions);
  const display = `${hour}:${minute === 0 ? "00" : minute}`;
  return {
    type: "clock",
    prompt: "Quelle heure indique cette horloge ?",
    answer: display,
    extra: { hour, minute },
  };
}

function generatePuzzle(exclude?: TemplateType): PuzzleState {
  const available = exclude ? TEMPLATES.filter(t => t !== exclude) : TEMPLATES;
  const type = pickRandom(available);
  switch (type) {
    case "code4": return generateCode4();
    case "math_seq": return generateMathSeq();
    case "grid3x3": return generateGrid3x3();
    case "anagram": return generateAnagram();
    case "clock": return generateClock();
  }
}

// ── Clock SVG component ───────────────────────────────────────────────────────

const ClockFace = ({ hour, minute }: { hour: number; minute: number }) => {
  const hourAngle = (hour % 12) * 30 + minute * 0.5 - 90;
  const minuteAngle = minute * 6 - 90;
  const r = 45;
  const hourLen = 25;
  const minLen = 35;

  const hourX = 50 + hourLen * Math.cos((hourAngle * Math.PI) / 180);
  const hourY = 50 + hourLen * Math.sin((hourAngle * Math.PI) / 180);
  const minX = 50 + minLen * Math.cos((minuteAngle * Math.PI) / 180);
  const minY = 50 + minLen * Math.sin((minuteAngle * Math.PI) / 180);

  return (
    <svg viewBox="0 0 100 100" className="w-48 h-48 mx-auto">
      <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
      {/* Hour markers */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x1 = 50 + 40 * Math.cos(angle);
        const y1 = 50 + 40 * Math.sin(angle);
        const x2 = 50 + 45 * Math.cos(angle);
        const y2 = 50 + 45 * Math.sin(angle);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--foreground))" strokeWidth={i % 3 === 0 ? "2" : "1"} />;
      })}
      {/* Hour hand */}
      <line x1="50" y1="50" x2={hourX} y2={hourY} stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinecap="round" />
      {/* Minute hand */}
      <line x1="50" y1="50" x2={minX} y2={minY} stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="50" r="3" fill="hsl(var(--primary))" />
    </svg>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const PrisonBreak = () => {
  const { countryCode } = useParams<{ countryCode: string }>();
  const navigate = useNavigate();

  const [puzzle, setPuzzle] = useState<PuzzleState | null>(null);
  const [userInput, setUserInput] = useState("");
  const [gridClicks, setGridClicks] = useState<number[]>([]);
  const [result, setResult] = useState<"pending" | "success" | "fail">("pending");
  const [attempts, setAttempts] = useState(0);

  // Code4: show/hide
  const [codeVisible, setCodeVisible] = useState(true);
  // Grid3x3: playback phase
  const [gridPhase, setGridPhase] = useState<"showing" | "input" | "done">("showing");
  const [gridHighlight, setGridHighlight] = useState<number | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startNewPuzzle = useCallback((excludeType?: TemplateType) => {
    const p = generatePuzzle(excludeType);
    setPuzzle(p);
    setUserInput("");
    setGridClicks([]);
    setResult("pending");
    setCodeVisible(true);
    setGridPhase("showing");
    setGridHighlight(null);
  }, []);

  useEffect(() => {
    startNewPuzzle();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  // Code4: auto-hide after showTime
  useEffect(() => {
    if (!puzzle || puzzle.type !== "code4" || !codeVisible) return;
    const t = setTimeout(() => setCodeVisible(false), (puzzle.extra.showTime ?? 3) * 1000);
    return () => clearTimeout(t);
  }, [puzzle, codeVisible]);

  // Grid3x3: play sequence
  useEffect(() => {
    if (!puzzle || puzzle.type !== "grid3x3" || gridPhase !== "showing") return;
    const seq: number[] = puzzle.extra.sequence;
    let i = 0;
    const play = () => {
      if (i < seq.length) {
        setGridHighlight(seq[i]);
        timeoutRef.current = setTimeout(() => {
          setGridHighlight(null);
          i++;
          timeoutRef.current = setTimeout(play, 300);
        }, 700);
      } else {
        setGridPhase("input");
      }
    };
    timeoutRef.current = setTimeout(play, 500);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [puzzle, gridPhase]);

  // ── Validation ──

  const checkAnswer = (input: string) => {
    if (!puzzle) return;
    const correct = input.trim().toUpperCase() === puzzle.answer.toUpperCase();
    if (correct) {
      setResult("success");
    } else {
      setResult("fail");
      setAttempts(prev => prev + 1);
    }
  };

  const handleGridClick = (cellIdx: number) => {
    if (!puzzle || puzzle.type !== "grid3x3" || gridPhase !== "input" || result !== "pending") return;
    const newClicks = [...gridClicks, cellIdx];
    setGridClicks(newClicks);

    const seq: number[] = puzzle.extra.sequence;
    // Check as they go
    if (newClicks[newClicks.length - 1] !== seq[newClicks.length - 1]) {
      setResult("fail");
      setAttempts(prev => prev + 1);
      return;
    }
    if (newClicks.length === seq.length) {
      setResult("success");
    }
  };

  const handleSubmit = () => {
    if (!puzzle) return;
    checkAnswer(userInput);
  };

  const handleSuccess = () => {
    // Navigate to next country (same as season mission would)
    navigate(`/season-mission/${countryCode}`);
  };

  const handleRetry = () => {
    startNewPuzzle(puzzle?.type);
  };

  if (!puzzle) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-xs font-display tracking-wider text-destructive uppercase">Prison Break</span>
          </div>
          <span className="text-xs font-display text-muted-foreground tracking-wider">
            TENTATIVE {attempts + 1} · {countryCode?.toUpperCase()}
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <AnimatePresence mode="wait">
          {result === "pending" && (
            <motion.div
              key={`puzzle-${attempts}-${puzzle.type}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md space-y-6"
            >
              {/* Puzzle icon + title */}
              <div className="text-center space-y-2">
                <Lock className="h-12 w-12 text-destructive mx-auto" />
                <h1 className="text-2xl font-display font-bold text-foreground tracking-wider">ÉVASION REQUISE</h1>
                <p className="text-sm text-muted-foreground">{puzzle.prompt}</p>
              </div>

              {/* ── CODE 4 ── */}
              {puzzle.type === "code4" && (
                <div className="space-y-4">
                  <div className="bg-card border border-border rounded-xl p-8 text-center">
                    {codeVisible ? (
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="flex items-center justify-center gap-1"
                      >
                        <Eye className="h-5 w-5 text-primary mr-2" />
                        <span className="text-4xl font-mono font-bold text-primary tracking-[0.3em]">
                          {puzzle.extra.code}
                        </span>
                      </motion.div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <EyeOff className="h-5 w-5" />
                        <span className="text-sm font-display">Code masqué — Entrez-le de mémoire</span>
                      </div>
                    )}
                  </div>
                  {!codeVisible && (
                    <div className="flex gap-2">
                      <Input
                        value={userInput}
                        onChange={e => setUserInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="_ _ _ _"
                        maxLength={4}
                        className="text-center text-2xl font-mono tracking-[0.3em]"
                        onKeyDown={e => e.key === "Enter" && userInput.length === 4 && handleSubmit()}
                      />
                      <Button onClick={handleSubmit} disabled={userInput.length !== 4} className="font-display">
                        VALIDER
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ── MATH SEQ ── */}
              {puzzle.type === "math_seq" && (
                <div className="space-y-4">
                  <div className="bg-card border border-border rounded-xl p-6 text-center">
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      {(puzzle.extra.seq as number[]).map((n, i) => (
                        <span key={i} className="text-2xl font-mono font-bold text-foreground">{n}</span>
                      ))}
                      <span className="text-2xl font-mono font-bold text-primary">?</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={userInput}
                      onChange={e => setUserInput(e.target.value.replace(/[^\d-]/g, ""))}
                      placeholder="Votre réponse"
                      className="text-center text-xl font-mono"
                      onKeyDown={e => e.key === "Enter" && userInput && handleSubmit()}
                    />
                    <Button onClick={handleSubmit} disabled={!userInput} className="font-display">
                      VALIDER
                    </Button>
                  </div>
                </div>
              )}

              {/* ── GRID 3×3 ── */}
              {puzzle.type === "grid3x3" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                    {Array.from({ length: 9 }, (_, i) => {
                      const isHighlighted = gridHighlight === i;
                      const isClicked = gridClicks.includes(i);
                      const clickOrder = gridClicks.indexOf(i);
                      return (
                        <motion.button
                          key={i}
                          onClick={() => handleGridClick(i)}
                          disabled={gridPhase !== "input"}
                          className={`aspect-square rounded-lg border-2 flex items-center justify-center text-lg font-display font-bold transition-all ${
                            isHighlighted
                              ? "bg-primary border-primary text-primary-foreground"
                              : isClicked
                                ? "bg-primary/20 border-primary/50 text-primary"
                                : "bg-card border-border hover:border-primary/30"
                          }`}
                          whileTap={gridPhase === "input" ? { scale: 0.9 } : {}}
                        >
                          {isClicked ? clickOrder + 1 : ""}
                        </motion.button>
                      );
                    })}
                  </div>
                  {gridPhase === "showing" && (
                    <p className="text-center text-xs text-muted-foreground font-display animate-pulse">
                      Observez la séquence...
                    </p>
                  )}
                  {gridPhase === "input" && (
                    <p className="text-center text-xs text-muted-foreground font-display">
                      Cliquez les cases dans le bon ordre ({gridClicks.length}/{puzzle.extra.count})
                    </p>
                  )}
                </div>
              )}

              {/* ── ANAGRAM ── */}
              {puzzle.type === "anagram" && (
                <div className="space-y-4">
                  <div className="bg-card border border-border rounded-xl p-6 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Shuffle className="h-5 w-5 text-primary mr-2" />
                      {(puzzle.extra.scrambled as string).split("").map((ch, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center justify-center w-10 h-12 bg-primary/10 border border-primary/30 rounded text-xl font-mono font-bold text-primary"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={userInput}
                      onChange={e => setUserInput(e.target.value.toUpperCase())}
                      placeholder="Le mot correct"
                      className="text-center text-xl font-mono uppercase tracking-wider"
                      onKeyDown={e => e.key === "Enter" && userInput && handleSubmit()}
                    />
                    <Button onClick={handleSubmit} disabled={!userInput} className="font-display">
                      VALIDER
                    </Button>
                  </div>
                </div>
              )}

              {/* ── CLOCK ── */}
              {puzzle.type === "clock" && (
                <div className="space-y-4">
                  <div className="bg-card border border-border rounded-xl p-6">
                    <ClockFace hour={puzzle.extra.hour} minute={puzzle.extra.minute} />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={userInput}
                      onChange={e => setUserInput(e.target.value)}
                      placeholder="H:MM (ex: 3:45)"
                      className="text-center text-xl font-mono"
                      onKeyDown={e => e.key === "Enter" && userInput && handleSubmit()}
                    />
                    <Button onClick={handleSubmit} disabled={!userInput} className="font-display">
                      VALIDER
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── SUCCESS ── */}
          {result === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md space-y-6 text-center"
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}>
                <Unlock className="h-20 w-20 text-primary mx-auto" />
              </motion.div>
              <h1 className="text-3xl font-display font-bold text-primary tracking-wider">ÉVASION RÉUSSIE</h1>
              <p className="text-muted-foreground">
                Vous avez percé le verrou. Le Protocole vous laisse une seconde chance.
              </p>
              <Button onClick={handleSuccess} className="w-full py-6 font-display tracking-wider text-lg">
                CONTINUER LA MISSION <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* ── FAIL ── */}
          {result === "fail" && (
            <motion.div
              key="fail"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md space-y-6 text-center"
            >
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
              <h2 className="text-2xl font-display font-bold text-destructive tracking-wider">ÉCHEC</h2>
              <p className="text-muted-foreground text-sm">
                Mauvaise réponse. Un nouveau défi vous attend.
              </p>
              {puzzle.type !== "grid3x3" && (
                <p className="text-xs text-muted-foreground">
                  Réponse attendue : <strong className="text-foreground">{puzzle.answer}</strong>
                </p>
              )}
              <Button onClick={handleRetry} className="w-full py-5 font-display tracking-wider">
                <RotateCcw className="h-4 w-4 mr-2" /> NOUVEAU DÉFI
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default PrisonBreak;
