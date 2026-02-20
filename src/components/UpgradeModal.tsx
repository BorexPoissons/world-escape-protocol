import { motion, AnimatePresence } from "framer-motion";
import { Shield, Star, Lock, ChevronRight, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UpgradeModalProps {
  open: boolean;
  onClose?: () => void;
  type?: "agent" | "director";
}

const PLAN = {
  label: "AGENT",
  color: "hsl(var(--primary))",
  price: "19.90",
  currency: "CHF",
  tagline: "AUTORISATION DE NIVEAU 2",
  headline: "Accès Agents — Confidentiel",
  description:
    "Vous avez prouvé votre valeur lors des missions initiales. Le Bureau estime que vous méritez un accès étendu à nos opérations mondiales.",
  features: [
    "50 pays débloqués — opérations sur 5 continents",
    "Missions narratives étendues avec fins multiples",
    "Accès aux archives classifiées de Niveau 2",
    "Badges exclusifs Agents",
    "Classement mondial des agents",
  ],
  cta: "Demander l'Autorisation Agent",
  icon: Shield,
};

const UpgradeModal = ({ open, onClose }: UpgradeModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const Icon = PLAN.icon;

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
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
    <AnimatePresence>
      {open && (
        <motion.div
          key="upgrade-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4"
        >
          <div className="pointer-events-none absolute inset-0 scanline" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative w-full max-w-lg bg-card border border-border rounded-xl overflow-hidden shadow-2xl border-glow"
          >
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />

            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-primary/30 bg-primary/10 mb-4">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <p className="text-xs font-display text-primary tracking-[0.3em] mb-2 animate-pulse-gold">
                  {PLAN.tagline}
                </p>
                <h2 className="font-display text-2xl font-bold text-foreground tracking-wider mb-3">
                  {PLAN.headline}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  {PLAN.description}
                </p>
              </div>

              <ul className="space-y-2.5 mb-8">
                {PLAN.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                    <Star className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="bg-secondary/50 border border-border rounded-lg p-5 text-center mb-4">
                <p className="text-xs text-muted-foreground font-display tracking-wider mb-1">
                  PAIEMENT UNIQUE — ACCÈS À VIE
                </p>
                <p className="text-4xl font-display font-bold text-primary mb-1">
                  {PLAN.price}
                  <span className="text-lg text-muted-foreground ml-1">{PLAN.currency}</span>
                </p>
                <p className="text-xs text-muted-foreground">Sans abonnement. Sans frais cachés.</p>
              </div>

              <Button
                className="w-full font-display tracking-wider text-sm gap-2"
                size="lg"
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {loading ? "CONNEXION SÉCURISÉE..." : PLAN.cta}
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors font-display tracking-wider"
                >
                  CONTINUER EN MODE GRATUIT
                </button>
              )}
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;
