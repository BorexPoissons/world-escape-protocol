import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Shield, ChevronRight, Lock, Globe, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const Season1Unlock: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { season: "season_1" },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL");
      }
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de lancer le paiement.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col">
      {/* Scanline */}
      <div className="pointer-events-none fixed inset-0 scanline z-50" />

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-display text-sm text-primary tracking-widest">W.E.P. — ACCÈS RESTREINT</span>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs text-muted-foreground hover:text-foreground font-display tracking-wider transition-colors"
          >
            RETOUR AU QG
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full space-y-8">

          {/* ── Omega symbol ── */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="text-7xl text-primary text-glow mb-4"
            >
              Ω
            </motion.div>
              <p className="text-[10px] font-display tracking-[0.5em] text-primary/50 mb-2">
                SIGNAL INITIAL — COMPLÉTÉ · MOT-CLÉ : OPEN
              </p>
          </motion.div>

          {/* ── Season 1 Title ── */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-[0.15em] text-primary text-glow mb-2">
              LES OBSERVATEURS
            </h1>
             <p className="text-sm font-display tracking-widest text-muted-foreground">
               SAISON I · 12 PAYS · L'INTERFÉRENCE COMMENCE
            </p>
          </motion.div>

          {/* ── Jasper Quote ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="rounded-xl border border-primary/20 bg-card p-8 border-glow relative overflow-hidden"
            style={{ boxShadow: "0 0 50px hsl(40 80% 55% / 0.08)" }}
          >
            <div className="absolute top-4 left-6 text-6xl text-primary/10 font-serif leading-none">"</div>
            <div className="relative z-10 space-y-4 pl-4">
              <p className="text-foreground leading-relaxed italic text-lg">
                Tu as prouvé que tu savais regarder.
              </p>
              <p className="text-foreground leading-relaxed italic">
                Cinq pays. Cinq indices. Un mot qui ouvre une porte que peu de gens connaissent.
                Mais derrière cette porte, il y a un réseau — et ce réseau a des yeux partout.
              </p>
              <p className="text-primary leading-relaxed italic font-display tracking-wider">
                Ils s'appellent les Observateurs. Et ils t'attendent au Brésil.
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-display text-primary">
                  JV
                </div>
                <div>
                  <p className="text-sm font-display text-foreground tracking-wider">Jasper Velcourt</p>
                  <p className="text-[10px] text-muted-foreground font-display tracking-wider">DIRECTEUR — W.E.P.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Next Destination: Brazil ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="rounded-xl border border-border bg-card/60 p-6 flex items-center gap-5"
          >
            <div
              className="w-16 h-16 rounded-xl border border-primary/30 flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(120 60% 20% / 0.3), hsl(50 80% 40% / 0.2))",
                boxShadow: "0 0 20px hsl(120 40% 30% / 0.15)",
              }}
            >
              <span className="text-3xl">🇧🇷</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <p className="text-[10px] font-display tracking-[0.3em] text-primary">
                  PROCHAINE DESTINATION OBLIGATOIRE
                </p>
              </div>
              <h3 className="text-xl font-display font-bold text-foreground tracking-wider">
                BRÉSIL
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rio de Janeiro · Opération 6 · Les Observateurs commencent ici.
              </p>
            </div>
            <Globe className="h-8 w-8 text-primary/20 flex-shrink-0" />
          </motion.div>

          {/* ── Price + CTA ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="space-y-4"
          >
            <div
              className="rounded-xl border border-primary/30 p-6 text-center border-glow"
              style={{ boxShadow: "0 0 40px hsl(40 80% 55% / 0.1)" }}
            >
              <p className="text-[10px] font-display tracking-[0.4em] text-muted-foreground mb-2">
                PAIEMENT UNIQUE — ACCÈS À VIE
              </p>
              <p className="text-5xl font-display font-bold text-primary mb-1">
                29
                <span className="text-xl text-muted-foreground ml-2">CHF</span>
              </p>
                 <p className="text-xs text-muted-foreground font-display tracking-wider">
                   Sans abonnement · Sans frais cachés · 12 pays débloqués
              </p>
            </div>

            <Button
              className="w-full font-display tracking-wider text-sm gap-2 py-7 text-base"
              size="lg"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
              {loading ? "CONNEXION SÉCURISÉE..." : "DÉBLOQUER LA SAISON I — 29 CHF"}
              <ChevronRight className="h-5 w-5 ml-auto" />
            </Button>

            <button
              onClick={() => navigate("/dashboard")}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors font-display tracking-[0.3em] py-2"
            >
              CONTINUER EN MODE GRATUIT
            </button>
          </motion.div>

          {/* ── Features list ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.6 }}
            className="grid grid-cols-2 gap-3 pb-8"
          >
            {[
              { icon: "🌍", text: "12 pays débloqués" },
              { icon: "📖", text: "Missions narratives étendues" },
              { icon: "🔐", text: "Archives classifiées Niv. 2" },
              { icon: "🏅", text: "Badges exclusifs Agents" },
            ].map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm text-muted-foreground rounded-lg border border-border/40 bg-card/30 px-4 py-3"
              >
                <span className="text-lg">{f.icon}</span>
                <span className="font-display text-xs tracking-wider">{f.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Season1Unlock;
