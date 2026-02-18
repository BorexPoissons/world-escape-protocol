import { motion, AnimatePresence } from "framer-motion";
import { Shield, Star, Lock, ChevronRight, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onClose?: () => void;
  /** "agent" = after free tier; "director" = after agent tier */
  type?: "agent" | "director";
}

const PLANS = {
  agent: {
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
  },
  director: {
    label: "DIRECTEUR",
    color: "hsl(40 90% 65%)",
    price: "119",
    currency: "CHF",
    tagline: "AUTORISATION DE NIVEAU MAXIMAL",
    headline: "Accès Directeur — Ultra-Secret",
    description:
      "Peu d'agents atteignent ce niveau. En tant que Directeur, vous aurez accès à des opérations dont l'existence même est niée officiellement.",
    features: [
      "Tous les pays — y compris les destinations secrètes",
      "Missions Directeur exclusives — non publiées",
      "Accès aux dossiers Noirs du Bureau",
      "Statut prioritaire dans les classements",
      "Accès anticipé à chaque nouvelle opération",
    ],
    cta: "Demander l'Autorisation Directeur",
    icon: Eye,
  },
};

const UpgradeModal = ({ open, onClose, type = "agent" }: UpgradeModalProps) => {
  const plan = PLANS[type];
  const Icon = plan.icon;

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
          {/* Scanline effect */}
          <div className="pointer-events-none absolute inset-0 scanline" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative w-full max-w-lg bg-card border border-border rounded-xl overflow-hidden shadow-2xl border-glow"
          >
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />

            {/* Close button (only when not full-screen forced) */}
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-primary/30 bg-primary/10 mb-4">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <p className="text-xs font-display text-primary tracking-[0.3em] mb-2 animate-pulse-gold">
                  {plan.tagline}
                </p>
                <h2 className="font-display text-2xl font-bold text-foreground tracking-wider mb-3">
                  {plan.headline}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  {plan.description}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-8">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                    <Star className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Price + CTA */}
              <div className="bg-secondary/50 border border-border rounded-lg p-5 text-center mb-4">
                <p className="text-xs text-muted-foreground font-display tracking-wider mb-1">
                  PAIEMENT UNIQUE — ACCÈS À VIE
                </p>
                <p className="text-4xl font-display font-bold text-primary mb-1">
                  {plan.price}
                  <span className="text-lg text-muted-foreground ml-1">{plan.currency}</span>
                </p>
                <p className="text-xs text-muted-foreground">Sans abonnement. Sans frais cachés.</p>
              </div>

              {/* Placeholder CTA — Stripe integration coming */}
              <Button
                className="w-full font-display tracking-wider text-sm gap-2"
                size="lg"
                disabled
                title="Paiement en cours d'intégration"
              >
                <Lock className="h-4 w-4" />
                {plan.cta}
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-3 font-display tracking-wider">
                SYSTÈME DE PAIEMENT EN COURS D'ACTIVATION
              </p>

              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors font-display tracking-wider"
                >
                  CONTINUER EN MODE GRATUIT
                </button>
              )}
            </div>

            {/* Bottom accent */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpgradeModal;
