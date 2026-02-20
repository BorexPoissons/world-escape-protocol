import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, Home, ArrowLeft, Lock, ChevronRight, Loader2, Sparkles,
  Star, Eye, Zap, Globe, Crown
} from "lucide-react";

type SeasonKey = "season_1" | "season_2" | "season_3" | "season_4" | "full_bundle";

interface SeasonCard {
  key: SeasonKey;
  number: number | null;
  label: string;
  tagline: string;
  countries: string;
  theme: string;
  price: number;
  reward: string;
  rewardIcon: string;
  features: string[];
  accentHsl: string;
  icon: typeof Shield;
  isBundle?: boolean;
}

const SEASONS: SeasonCard[] = [
  {
    key: "season_1",
    number: 1,
    label: "LES OBSERVATEURS",
    tagline: "L'interférence commence",
    countries: "45 pays · Pays 6–50",
    theme: "Surveillance · Réseaux · Infiltration",
    price: 29,
    reward: "Clé Oméga + Accès Saison II",
    rewardIcon: "🔐",
    features: [
      "45 pays débloqués — opérations sur 5 continents",
      "Missions narratives avec fins multiples",
      "Archives classifiées de Niveau 2",
      "Badges exclusifs Saison I",
    ],
    accentHsl: "220 80% 65%",
    icon: Eye,
  },
  {
    key: "season_2",
    number: 2,
    label: "LES ARCHITECTES",
    tagline: "L'origine du Protocole",
    countries: "50 pays · Pays 51–100",
    theme: "Organisations internationales · Zones stratégiques",
    price: 29,
    reward: "Fragment Atlas + Badge Stratège Global",
    rewardIcon: "🗺",
    features: [
      "50 nouveaux pays débloqués",
      "Découverte de l'origine du Protocole",
      "Fragment Atlas + Badge Stratège Global",
      "Zones économiques stratégiques",
    ],
    accentHsl: "160 60% 52%",
    icon: Globe,
  },
  {
    key: "season_3",
    number: 3,
    label: "LA FAILLE",
    tagline: "La réalité se déstabilise",
    countries: "50 pays · Pays 101–150",
    theme: "Crises contrôlées · Routes énergétiques · Pouvoir invisible",
    price: 29,
    reward: "Fragment Dominion + Badge Architecte du Réseau",
    rewardIcon: "⚡",
    features: [
      "50 nouveaux pays débloqués",
      "La réalité se déstabilise",
      "Fragment Dominion + Badge Architecte du Réseau",
      "Pouvoir invisible révélé",
    ],
    accentHsl: "280 65% 62%",
    icon: Zap,
  },
  {
    key: "season_4",
    number: 4,
    label: "LE PROTOCOLE FINAL",
    tagline: "Tout converge — Révélation ultime",
    countries: "45 pays · Pays 151–195",
    theme: "Pays Stratégiques · Assemblage final",
    price: 29,
    reward: "Carte mondiale révélée + Titre Maître du Protocole",
    rewardIcon: "🧩",
    features: [
      "45 derniers pays débloqués",
      "Assemblage final du Protocole",
      "Carte mondiale révélée",
      "Titre Maître du Protocole",
    ],
    accentHsl: "0 70% 58%",
    icon: Crown,
  },
];

const BUNDLE: SeasonCard = {
  key: "full_bundle",
  number: null,
  label: "ÉDITION INTÉGRALE",
  tagline: "Les 4 saisons · 190 pays · Accès à vie",
  countries: "190 pays · Toutes les saisons",
  theme: "Du Signal Initial au Protocole Final",
  price: 99,
  reward: "Révélation totale Ω + Tous les titres",
  rewardIcon: "◈",
  features: [
    "Les 4 saisons débloquées — 190 pays",
    "Économisez 17 CHF vs achat séparé",
    "Accès immédiat à tout le contenu",
    "Tous les badges, titres et révélations",
    "Révélation totale Ω garantie",
  ],
  accentHsl: "40 80% 55%",
  icon: Sparkles,
  isBundle: true,
};

const Seasons = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingSeason, setLoadingSeason] = useState<string | null>(null);

  const handleCheckout = async (season: SeasonKey) => {
    setLoadingSeason(season);
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
      setLoadingSeason(null);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-display tracking-wider">DASHBOARD</span>
            </Link>
            <span className="text-border">|</span>
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="font-display text-sm font-bold text-primary tracking-wider">
              PROTOCOLE D'ACCÈS
            </h1>
          </div>
          <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
            <Home className="h-4 w-4" />
            <span className="text-xs font-display tracking-wider hidden sm:inline">ACCUEIL</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="text-xs font-display tracking-[0.4em] text-primary mb-3 animate-pulse">
            WORLD ESCAPE PROTOCOL
          </p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-wider mb-4">
            CHOISISSEZ VOTRE ACCÈS
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Chaque saison déverrouille de nouveaux pays, de nouvelles missions et des révélations narratives.
            Paiement unique — accès à vie. Sans abonnement.
          </p>
        </motion.div>

        {/* Bundle — featured */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <div
            className="relative rounded-2xl border-2 overflow-hidden"
            style={{
              borderColor: `hsl(${BUNDLE.accentHsl} / 0.5)`,
              background: `linear-gradient(135deg, hsl(var(--card)), hsl(${BUNDLE.accentHsl} / 0.06))`,
              boxShadow: `0 0 60px hsl(${BUNDLE.accentHsl} / 0.1)`,
            }}
          >
            {/* Best value badge */}
            <div
              className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-xs font-display font-bold tracking-wider"
              style={{
                background: `hsl(${BUNDLE.accentHsl})`,
                color: "hsl(var(--primary-foreground))",
              }}
            >
              MEILLEURE OFFRE
            </div>

            <div className="p-6 sm:p-8 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-full border"
                    style={{ borderColor: `hsl(${BUNDLE.accentHsl} / 0.4)`, background: `hsl(${BUNDLE.accentHsl} / 0.1)` }}
                  >
                    <Sparkles className="h-6 w-6" style={{ color: `hsl(${BUNDLE.accentHsl})` }} />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-foreground tracking-wider">
                      {BUNDLE.label}
                    </h3>
                    <p className="text-xs text-muted-foreground font-display tracking-wider">
                      {BUNDLE.tagline}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {BUNDLE.theme}. L'intégralité de l'aventure en un seul accès.
                </p>
                <ul className="space-y-2">
                  {BUNDLE.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                      <Star className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: `hsl(${BUNDLE.accentHsl})` }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-center">
                <div className="bg-secondary/50 border border-border rounded-xl p-6 mb-4">
                  <p className="text-xs text-muted-foreground font-display tracking-wider mb-1">
                    PAIEMENT UNIQUE — ACCÈS À VIE
                  </p>
                  <div className="flex items-baseline justify-center gap-1 mb-1">
                    <span className="text-5xl font-display font-bold text-primary">{BUNDLE.price}</span>
                    <span className="text-lg text-muted-foreground font-display">CHF</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    au lieu de 116 CHF · <span className="text-primary font-bold">Économisez 17 CHF</span>
                  </p>
                </div>
                <Button
                  className="w-full font-display tracking-wider text-sm gap-2"
                  size="lg"
                  onClick={() => handleCheckout("full_bundle")}
                  disabled={loadingSeason !== null}
                >
                  {loadingSeason === "full_bundle" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {loadingSeason === "full_bundle" ? "CONNEXION SÉCURISÉE..." : "DÉBLOQUER L'ÉDITION INTÉGRALE"}
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Separator */}
        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-display tracking-[0.3em] text-muted-foreground">OU PAR SAISON</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Season cards grid */}
        <div className="grid sm:grid-cols-2 gap-6">
          {SEASONS.map((s, idx) => {
            const Icon = s.icon;
            const isLoading = loadingSeason === s.key;

            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.08 }}
                className="rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-lg group"
                style={{
                  borderColor: `hsl(${s.accentHsl} / 0.25)`,
                  background: `linear-gradient(180deg, hsl(var(--card)), hsl(${s.accentHsl} / 0.03))`,
                }}
              >
                {/* Season header bar */}
                <div
                  className="h-1 w-full"
                  style={{ background: `linear-gradient(90deg, transparent, hsl(${s.accentHsl}), transparent)` }}
                />

                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-full border"
                      style={{ borderColor: `hsl(${s.accentHsl} / 0.3)`, background: `hsl(${s.accentHsl} / 0.1)` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: `hsl(${s.accentHsl})` }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-display tracking-[0.3em] text-muted-foreground">
                        SAISON {s.number}
                      </p>
                      <h3 className="font-display text-base font-bold text-foreground tracking-wider">
                        {s.label}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-1 font-display tracking-wider">
                    {s.countries}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mb-4 italic">
                    {s.tagline}
                  </p>

                  <ul className="space-y-1.5 mb-5">
                    {s.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                        <Star className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: `hsl(${s.accentHsl})` }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Reward */}
                  <div
                    className="rounded-lg px-3 py-2 mb-5 text-xs font-display tracking-wider flex items-center gap-2"
                    style={{
                      background: `hsl(${s.accentHsl} / 0.08)`,
                      borderLeft: `3px solid hsl(${s.accentHsl} / 0.4)`,
                      color: `hsl(${s.accentHsl})`,
                    }}
                  >
                    <span>{s.rewardIcon}</span>
                    <span>{s.reward}</span>
                  </div>

                  {/* Price + CTA */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-2xl font-display font-bold text-foreground">{s.price}</span>
                      <span className="text-sm text-muted-foreground ml-1">CHF</span>
                    </div>
                    <Button
                      size="sm"
                      className="font-display tracking-wider text-xs gap-1.5"
                      onClick={() => handleCheckout(s.key)}
                      disabled={loadingSeason !== null}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                      {isLoading ? "..." : "DÉBLOQUER"}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Free tier reminder */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-5 py-2.5">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-display tracking-wider text-muted-foreground">
              SIGNAL INITIAL — 5 pays gratuits inclus pour tous les agents
            </span>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Seasons;
