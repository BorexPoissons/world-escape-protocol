import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Key, Lock, Unlock, CheckCircle, XCircle,
  ArrowRight, Home, Loader2, Sparkles
} from "lucide-react";

const FRAGMENT_LABELS = [
  "V-01", "V-02", "V-03", "V-04", "V-05", "V-06",
  "V-07", "V-08", "V-09", "V-10", "V-11", "V-12",
];

const S1_COUNTRY_CODES = ["CH", "GR", "IN", "MA", "IT", "JP", "MX", "PE", "TR", "ET", "KH", "DE"];

type Phase = "loading" | "inventory" | "assembling" | "pi_game" | "pi_fail" | "complete";

const Season1Complete = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("loading");
  const [fragments, setFragments] = useState<boolean[]>(new Array(12).fill(false));
  const [piInput, setPiInput] = useState("");
  const [piAttempts, setPiAttempts] = useState(0);
  const [assemblyStep, setAssemblyStep] = useState(0);

  const allCollected = fragments.every(Boolean);
  const collectedCount = fragments.filter(Boolean).length;

  useEffect(() => {
    if (!user) return;
    loadFragments();
  }, [user]);

  const loadFragments = async () => {
    if (!user) return;

    // Get country IDs for S1 codes
    const { data: countries } = await supabase
      .from("countries")
      .select("id, code")
      .in("code", S1_COUNTRY_CODES);

    if (!countries) {
      setPhase("inventory");
      return;
    }

    const countryIds = countries.map(c => c.id);

    // Get user fragments for these countries
    const { data: userFragments } = await supabase
      .from("user_fragments")
      .select("country_id")
      .eq("user_id", user.id)
      .in("country_id", countryIds);

    const ownedCountryIds = new Set((userFragments ?? []).map(f => f.country_id));

    // Map to ordered booleans
    const ordered = S1_COUNTRY_CODES.map(code => {
      const country = countries.find(c => c.code === code);
      return country ? ownedCountryIds.has(country.id) : false;
    });

    setFragments(ordered);
    setPhase("inventory");
  };

  // Assembly animation
  useEffect(() => {
    if (phase !== "assembling") return;
    if (assemblyStep >= 12) {
      setTimeout(() => setPhase("pi_game"), 800);
      return;
    }
    const t = setTimeout(() => setAssemblyStep(prev => prev + 1), 300);
    return () => clearTimeout(t);
  }, [phase, assemblyStep]);

  const startAssembly = () => {
    setAssemblyStep(0);
    setPhase("assembling");
  };

  const handlePiSubmit = async () => {
    if (piInput.trim() === "314159") {
      // Mark season complete
      if (user) {
        await supabase
          .from("profiles")
          .update({ season_1_unlocked: true })
          .eq("user_id", user.id);
      }
      setPhase("complete");
      toast({ title: "🔑 CLÉ ASSEMBLÉE", description: "WATCHER — ACCESS LEVEL 1" });
    } else {
      setPiAttempts(prev => prev + 1);
      setPiInput("");
      setPhase("pi_fail");
    }
  };

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-display tracking-wider text-primary uppercase">
              Saison I — Assemblage Final
            </span>
          </div>
          <button onClick={() => navigate("/dashboard")} className="text-xs text-muted-foreground hover:text-foreground font-display tracking-wider">
            <Home className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <AnimatePresence mode="wait">

          {/* ── INVENTORY ── */}
          {phase === "inventory" && (
            <motion.div key="inventory" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="text-center space-y-2">
                <Key className="h-12 w-12 text-primary mx-auto" />
                <h1 className="text-3xl font-display font-bold text-foreground tracking-wider">
                  FRAGMENTS DE SAISON I
                </h1>
                <p className="text-sm text-muted-foreground">
                  {collectedCount}/12 fragments collectés — {allCollected ? "Assemblage disponible" : "Complétez tous les pays"}
                </p>
              </div>

              {/* Fragment grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {FRAGMENT_LABELS.map((label, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                      fragments[i]
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground/40"
                    }`}
                  >
                    {fragments[i] ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    <span className="text-[10px] font-display font-bold tracking-wider">{label}</span>
                    <span className="text-[8px] font-display tracking-wider opacity-60">{S1_COUNTRY_CODES[i]}</span>
                  </motion.div>
                ))}
              </div>

              {/* Country progress */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex justify-between text-xs text-muted-foreground font-display mb-2">
                  <span>PROGRESSION</span>
                  <span>{collectedCount}/12</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(collectedCount / 12) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {allCollected ? (
                <Button onClick={startAssembly} className="w-full py-6 font-display tracking-wider text-lg">
                  <Key className="h-5 w-5 mr-2" /> ASSEMBLER LA CLÉ DU VEILLEUR
                </Button>
              ) : (
                <Button onClick={() => navigate("/season-mission/" + S1_COUNTRY_CODES[fragments.findIndex(f => !f)])} className="w-full py-5 font-display tracking-wider">
                  CONTINUER LES MISSIONS <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </motion.div>
          )}

          {/* ── ASSEMBLING ANIMATION ── */}
          {phase === "assembling" && (
            <motion.div key="assembling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 text-center">
              <h2 className="text-2xl font-display font-bold text-primary tracking-wider animate-pulse">
                ASSEMBLAGE EN COURS...
              </h2>

              <div className="grid grid-cols-6 gap-2 max-w-sm mx-auto">
                {FRAGMENT_LABELS.map((label, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0.3, scale: 0.5, rotate: -180 }}
                    animate={
                      i < assemblyStep
                        ? { opacity: 1, scale: 1, rotate: 0 }
                        : { opacity: 0.3, scale: 0.5, rotate: -180 }
                    }
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="aspect-square rounded-lg border-2 border-primary bg-primary/15 flex items-center justify-center"
                  >
                    <span className="text-[9px] font-display font-bold text-primary tracking-wider">{label}</span>
                  </motion.div>
                ))}
              </div>

              {assemblyStep >= 12 && (
                <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }}>
                  <Sparkles className="h-12 w-12 text-primary mx-auto animate-pulse" />
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── PI GAME ── */}
          {phase === "pi_game" && (
            <motion.div key="pi" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 text-center">
              <div className="space-y-3">
                <Lock className="h-16 w-16 text-primary mx-auto" />
                <h1 className="text-3xl font-display font-bold text-foreground tracking-wider">
                  VÉRIFICATION FINALE
                </h1>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  La clé est assemblée mais un dernier verrou protège l'accès.
                  Le Protocole exige une séquence précise pour valider votre identité.
                </p>
              </div>

              <div className="bg-card border border-primary/30 rounded-xl p-8 space-y-4">
                <p className="text-xs font-display tracking-[0.3em] text-primary">
                  INDICE DU VEILLEUR
                </p>
                <p className="text-lg text-foreground italic leading-relaxed">
                  "Le cercle parfait cache un nombre infini.
                  <br />
                  Ses six premiers chiffres ouvrent la porte."
                </p>
                <div className="flex items-center justify-center gap-1 text-4xl font-mono text-primary/30 tracking-wider">
                  <span>π</span>
                  <span>=</span>
                  <span>?</span>
                </div>
              </div>

              <div className="flex gap-3 max-w-sm mx-auto">
                <Input
                  value={piInput}
                  onChange={e => setPiInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="_ _ _ _ _ _"
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-[0.3em] flex-1"
                  onKeyDown={e => e.key === "Enter" && piInput.length === 6 && handlePiSubmit()}
                />
                <Button onClick={handlePiSubmit} disabled={piInput.length !== 6} className="font-display px-6">
                  VALIDER
                </Button>
              </div>

              {piAttempts > 0 && (
                <p className="text-xs text-muted-foreground">
                  Tentative{piAttempts > 1 ? "s" : ""} : {piAttempts}
                </p>
              )}
            </motion.div>
          )}

          {/* ── PI FAIL ── */}
          {phase === "pi_fail" && (
            <motion.div key="pi-fail" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center">
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
              <h2 className="text-2xl font-display font-bold text-destructive tracking-wider">
                SÉQUENCE INCORRECTE
              </h2>
              <p className="text-sm text-muted-foreground">
                Le Protocole rejette cette combinaison. Réessayez.
              </p>
              <Button onClick={() => setPhase("pi_game")} className="font-display tracking-wider">
                RÉESSAYER <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* ── COMPLETE ── */}
          {phase === "complete" && (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 150, damping: 12, delay: 0.2 }}
              >
                <Unlock className="h-24 w-24 text-primary mx-auto" />
              </motion.div>

              <div className="space-y-2">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-4xl font-display font-bold text-primary tracking-wider"
                >
                  CLÉ ASSEMBLÉE
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-lg font-display text-foreground tracking-wider"
                >
                  WATCHER — ACCESS LEVEL 1
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="bg-card border-2 border-primary/40 rounded-xl p-8 space-y-4"
                style={{ boxShadow: "0 0 60px hsl(var(--primary) / 0.15)" }}
              >
                <div className="grid grid-cols-6 gap-1.5 max-w-xs mx-auto">
                  {FRAGMENT_LABELS.map((label, i) => (
                    <div key={label} className="aspect-square rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <span className="text-[8px] font-display font-bold text-primary">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground font-display tracking-wider mb-1">SAISON I COMPLÉTÉE</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Les 12 fragments ont été assemblés. Le réseau des Observateurs est déchiffré.
                    <br />
                    La prochaine saison vous attend.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="flex gap-3"
              >
                <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1 py-5 font-display tracking-wider">
                  <Home className="h-4 w-4 mr-2" /> TABLEAU DE BORD
                </Button>
                <Button onClick={() => navigate("/seasons")} className="flex-1 py-5 font-display tracking-wider">
                  SAISON II <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
};

export default Season1Complete;
