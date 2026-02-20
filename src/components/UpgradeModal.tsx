import { motion, AnimatePresence } from "framer-motion";
import { Shield, Star, Lock, ChevronRight, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UpgradeModalProps {
  open: boolean;
  onClose?: () => void;
  /** Which season to purchase — defaults to season_1 */
  season?: "season_1" | "season_2" | "season_3" | "season_4" | "full_bundle";
}

const SEASON_INFO: Record<string, {
  label: string;
  tagline: string;
  headline: string;
  description: string;
  price: string;
  features: string[];
  cta: string;
  icon: typeof Shield;
}> = {
  season_1: {
    label: "SAISON I",
    tagline: "LES OBSERVATEURS",
    headline: "Saison I — Les Observateurs",
    description:
      "Vous avez prouvé que vous saviez regarder. Mais derrière la porte, un réseau vous surveille. 45 pays. L'interférence commence.",
    price: "29",
    features: [
      "45 pays débloqués — opérations sur 5 continents",
      "Missions narratives avec fins multiples",
      "Archives classifiées de Niveau 2",
      "Badges exclusifs Saison I",
      "Classement mondial des agents",
    ],
    cta: "Débloquer la Saison I — 29 CHF",
    icon: Shield,
  },
  season_2: {
    label: "SAISON II",
    tagline: "LES ARCHITECTES",
    headline: "Saison II — Les Architectes",
    description:
      "Les connexions se dessinent. Vous remontez aux origines du Protocole. 50 pays. La vérité a un prix.",
    price: "29",
    features: [
      "50 nouveaux pays débloqués",
      "Découverte de l'origine du Protocole",
      "Fragment Atlas + Badge Stratège Global",
      "Missions de niveau Architecte",
      "Zones économiques stratégiques",
    ],
    cta: "Débloquer la Saison II — 29 CHF",
    icon: Shield,
  },
  season_3: {
    label: "SAISON III",
    tagline: "LA FAILLE",
    headline: "Saison III — La Faille",
    description:
      "La réalité commence à se déstabiliser. Les certitudes s'effondrent. 50 pays. Rien n'est ce qu'il paraît.",
    price: "29",
    features: [
      "50 nouveaux pays débloqués",
      "La réalité se déstabilise",
      "Fragment Dominion + Badge Architecte du Réseau",
      "Crises contrôlées et routes énergétiques",
      "Pouvoir invisible révélé",
    ],
    cta: "Débloquer la Saison III — 29 CHF",
    icon: Shield,
  },
  season_4: {
    label: "SAISON IV",
    tagline: "LE PROTOCOLE FINAL",
    headline: "Saison IV — Le Protocole Final",
    description:
      "Tout converge. L'assemblage final commence. 45 pays. La révélation ultime vous attend.",
    price: "29",
    features: [
      "45 derniers pays débloqués",
      "Assemblage final du Protocole",
      "Carte mondiale révélée",
      "Titre Maître du Protocole",
      "Révélation totale Ω",
    ],
    cta: "Débloquer la Saison IV — 29 CHF",
    icon: Shield,
  },
  full_bundle: {
    label: "ÉDITION INTÉGRALE",
    tagline: "WORLD ESCAPE PROTOCOL",
    headline: "Édition Intégrale",
    description:
      "Les 4 saisons. 190 pays. Du Signal Initial au Protocole Final. L'intégralité de l'aventure en un seul accès.",
    price: "99",
    features: [
      "Les 4 saisons débloquées — 190 pays",
      "Économisez 17 CHF vs achat séparé",
      "Accès immédiat à tout le contenu",
      "Tous les badges et titres",
      "Révélation totale Ω garantie",
    ],
    cta: "Débloquer l'Édition Intégrale — 99 CHF",
    icon: Sparkles,
  },
};

const UpgradeModal = ({ open, onClose, season = "season_1" }: UpgradeModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const info = SEASON_INFO[season] || SEASON_INFO.season_1;
  const Icon = info.icon;

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { season },
      });
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
                  {info.tagline}
                </p>
                <h2 className="font-display text-2xl font-bold text-foreground tracking-wider mb-3">
                  {info.headline}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  {info.description}
                </p>
              </div>

              <ul className="space-y-2.5 mb-8">
                {info.features.map((f, i) => (
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
                  {info.price}
                  <span className="text-lg text-muted-foreground ml-1">CHF</span>
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
                {loading ? "CONNEXION SÉCURISÉE..." : info.cta}
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
