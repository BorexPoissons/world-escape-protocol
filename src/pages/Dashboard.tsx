import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Globe, LogOut, Shield, Star, Map, Puzzle, Home, Lock, Flame, Trophy, Eye, ChevronRight, TrendingUp, CheckCircle2, PlayCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import CountryCard from "@/components/CountryCard";
import FlagImage from "@/components/FlagImage";
import type { Tables } from "@/integrations/supabase/types";
import { BADGE_META, type BadgeKey } from "@/lib/badges";
import UpgradeModal from "@/components/UpgradeModal";
import IntroScreen from "@/components/IntroScreen";

type ProfileData = Tables<"profiles"> & { subscription_type?: string };
type CountryRow = Tables<"countries"> & {
  release_order?: number;
  phase?: number;
  is_secret?: boolean;
  visibility_level?: number;
  season_number?: number;
};

// --- Subscription tier helpers ---
type Tier = "free" | "season1" | "season2" | "season3" | "director";

function getTier(profile: ProfileData | null): Tier {
  const sub = (profile as any)?.subscription_type ?? "free";
  if (sub === "director") return "director";
  if (sub === "season3") return "season3";
  if (sub === "season2") return "season2";
  // "agent" is legacy = season1
  if (sub === "agent" || sub === "season1") return "season1";
  return "free";
}

function getMaxPlayableSeason(tier: Tier): number {
  if (tier === "director") return 99;
  if (tier === "season3") return 3;
  if (tier === "season2") return 2;
  if (tier === "season1") return 1;
  return 0; // free: only season 0 (5 gratuits)
}

type CountryState = "playable" | "locked_upgrade" | "silhouette";

function getCountryState(country: CountryRow, tier: Tier): CountryState {
  const season: number = (country as any).season_number ?? 0;
  const maxSeason = getMaxPlayableSeason(tier);

  if (season <= maxSeason) return "playable";
  // The very next season = locked upgrade CTA (only first country visible as teaser)
  if (season === maxSeason + 1) return "locked_upgrade";
  // Everything beyond = silhouette
  return "silhouette";
}

// Level-based unlock within playable countries
function isCountryUnlocked(country: CountryRow, playerLevel: number): boolean {
  const requiredLevel = (country.difficulty_base - 1) * 2 + 1;
  return playerLevel >= requiredLevel;
}

// Cinematic title based on global completion percentage
const TITLE_THRESHOLDS: Array<{ min: number; title: string; subtitle: string; color: string }> = [
  { min: 100, title: "MAÎTRE DU PROTOCOLE", subtitle: "La vérité est entre vos mains", color: "hsl(0 70% 58%)" },
  { min: 50,  title: "ARCHITECTE",          subtitle: "Le réseau se révèle",           color: "hsl(280 65% 62%)" },
  { min: 20,  title: "STRATÈGE",            subtitle: "Les connexions s'assemblent",   color: "hsl(160 60% 52%)" },
  { min: 5,   title: "AGENT",               subtitle: "L'enquête prend forme",         color: "hsl(220 80% 65%)" },
  { min: 0,   title: "EXPLORATEUR",         subtitle: "Le plan commence à se révéler…", color: "hsl(40 85% 62%)" },
];

function getProgressTitle(globalPct: number) {
  return TITLE_THRESHOLDS.find(t => globalPct >= t.min) ?? TITLE_THRESHOLDS[TITLE_THRESHOLDS.length - 1];
}

// Map brightness based on global completion %
function getMapBrightness(pct: number): number {
  if (pct >= 100) return 1.0;
  if (pct >= 75)  return 0.88;
  if (pct >= 50)  return 0.78;
  if (pct >= 25)  return 0.65;
  if (pct >= 10)  return 0.55;
  return 0.42;
}

const TOTAL_COUNTRIES = 195;

// Operation metadata — narrative branding
const SEASON_META: Record<number, {
  label: string;
  codename: string;
  subtitle: string;
  theme: string;
  reward: string;
  rewardIcon: string;
  price?: string;
  upgradeType?: "season1" | "season2" | "season3" | "director";
  accentColor: string;
}> = {
  0: {
    label: "SIGNAL INITIAL",
    codename: "OP-00 · ACCÈS GRATUIT",
    subtitle: "5 pays — Découvrez qu'un réseau mondial existe",
    theme: "Finance · Géopolitique · Premiers indices",
    reward: "Badge Agent Initié",
    rewardIcon: "🎖",
    accentColor: "hsl(40 85% 62%)",
  },
  1: {
    label: "PROTOCOLE OMÉGA",
    codename: "OP-01 · OPÉRATION I",
    subtitle: "43 pays · Fondations du système mondial",
    theme: "Finance · Ressources · Technologie · Influence",
    reward: "Clé Oméga + Accès Opération Atlas",
    rewardIcon: "🔐",
    price: "19.90 CHF",
    upgradeType: "season1",
    accentColor: "hsl(220 80% 65%)",
  },
  2: {
    label: "RÉSEAU ATLAS",
    codename: "OP-02 · OPÉRATION II",
    subtitle: "50 pays · Les connexions entre États",
    theme: "Organisations internationales · Zones économiques stratégiques",
    reward: "Fragment Atlas + Badge Stratège Global",
    rewardIcon: "🗺",
    price: "À venir",
    upgradeType: "season2",
    accentColor: "hsl(160 60% 52%)",
  },
  3: {
    label: "DOMINION SHADOW",
    codename: "OP-03 · OPÉRATION III",
    subtitle: "50 pays · Manipulation indirecte",
    theme: "Crises contrôlées · Routes énergétiques · Pouvoir invisible",
    reward: "Fragment Dominion + Badge Architecte du Réseau",
    rewardIcon: "⚡",
    price: "À venir",
    upgradeType: "season3",
    accentColor: "hsl(280 65% 62%)",
  },
  4: {
    label: "CONVERGENCE 195",
    codename: "OP-04 · OPÉRATION IV · FINALE",
    subtitle: "47 pays · Les nœuds finaux — Tout converge",
    theme: "Pays Stratégiques · La révélation finale",
    reward: "Carte mondiale révélée + Titre Maître du Protocole",
    rewardIcon: "🧩",
    price: "À venir",
    upgradeType: "director",
    accentColor: "hsl(0 70% 58%)",
  },
};


const INTRO_SEEN_KEY = "wep_intro_seen";

// Fixed SIGNAL_INITIAL sequence for free sequential unlock
const SIGNAL_INITIAL_SEQUENCE = ["CH", "FR", "EG", "US", "JP"];

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [completedCountries, setCompletedCountries] = useState<string[]>([]);
  const [collectedCountryCodes, setCollectedCountryCodes] = useState<string[]>([]);
  const [userTokens, setUserTokens] = useState<Array<{ country_code: string; letter: string; revealed: boolean }>>([]);
  const [userBadges, setUserBadges] = useState<BadgeKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  // player_country_progress: map country_code → best_score (for sequential unlock)
  const [signalProgress, setSignalProgress] = useState<Record<string, number>>({});
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; type: "agent" | "director" }>({
    open: false,
    type: "agent",
  });
  // Cinematic intro — auto on first visit, replayable
  const [showIntro, setShowIntro] = useState(false);
  // Leaderboard visibility toggle
  const [leaderboardVisible, setLeaderboardVisible] = useState(true);
  const [leaderboardTogglingLoading, setLeaderboardTogglingLoading] = useState(false);
  const isDemo = !user;

  // Auto-play intro on first visit (per-browser flag)
  useEffect(() => {
    const seen = localStorage.getItem(INTRO_SEEN_KEY);
    if (!seen) {
      setShowIntro(true);
    }
  }, []);

  const handleIntroComplete = () => {
    localStorage.setItem(INTRO_SEEN_KEY, "1");
    setShowIntro(false);
  };

  const handleReplayIntro = () => {
    setShowIntro(true);
  };

  const fetchData = useCallback(async () => {
    if (!user) {
      const { data } = await supabase.from("countries").select("*").order("release_order");
      if (data) setCountries(data as CountryRow[]);
      setLoading(false);
      return;
    }

    const [countriesRes, profileRes, missionsRes, rolesRes, badgesRes, signalProgressRes, fragmentsRes, tokensRes] = await Promise.all([
      supabase.from("countries").select("*").order("release_order"),
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("missions").select("country_id").eq("user_id", user.id).eq("completed", true),
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin"),
      supabase.from("user_badges").select("badge_key").eq("user_id", user.id),
      (supabase as any).from("player_country_progress")
        .select("country_code, best_score")
        .eq("user_id", user.id)
        .in("country_code", SIGNAL_INITIAL_SEQUENCE),
      (supabase as any).from("user_fragments")
        .select("*, countries(code)")
        .eq("user_id", user.id),
      (supabase as any).from("user_tokens")
        .select("country_code, letter, revealed")
        .eq("user_id", user.id),
    ]);

    if (countriesRes.data) setCountries(countriesRes.data as CountryRow[]);
    if (profileRes.data) {
      setProfile(profileRes.data as any);
      // Load leaderboard_visible from profile
      setLeaderboardVisible((profileRes.data as any).leaderboard_visible ?? true);
    }
    if (missionsRes.data) setCompletedCountries(missionsRes.data.map((m: any) => m.country_id));
    if (rolesRes.data && rolesRes.data.length > 0) setIsAdmin(true);
    if (badgesRes.data) setUserBadges(badgesRes.data.map((b: any) => b.badge_key));
    if (signalProgressRes.data) {
      const map: Record<string, number> = {};
      for (const row of signalProgressRes.data as any[]) {
        map[row.country_code] = row.best_score ?? 0;
      }
      setSignalProgress(map);
    }
    if (fragmentsRes.data) {
      const codes = (fragmentsRes.data as any[]).map((f: any) => f.countries?.code).filter(Boolean);
      setCollectedCountryCodes([...new Set(codes)] as string[]);
    }
    if (tokensRes.data) {
      setUserTokens((tokensRes.data as any[]).map((t: any) => ({
        country_code: t.country_code,
        letter: t.letter,
        revealed: t.revealed,
      })));
    }
    setLoading(false);
  }, [user]);

  const handleLeaderboardToggle = async () => {
    if (!user || leaderboardTogglingLoading) return;
    setLeaderboardTogglingLoading(true);
    const newValue = !leaderboardVisible;
    setLeaderboardVisible(newValue);
    await (supabase.from("profiles") as any).update({ leaderboard_visible: newValue }).eq("user_id", user.id);
    setLeaderboardTogglingLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh on return from mission (?refresh=1 param)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("refresh") === "1") {
      fetchData();
    }
  }, [location.search, fetchData]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary font-display animate-pulse-gold text-xl tracking-widest">CHARGEMENT DU DOSSIER...</div>
      </div>
    );
  }

  const playerLevel = profile?.level ?? 1;
  const tier = getTier(profile);
  const maxSeason = getMaxPlayableSeason(tier);

  // Group countries by season
  interface SeasonGroup { playable: CountryRow[]; locked: CountryRow[]; silhouette: CountryRow[] }
  const seasonGroupsRaw: Record<number, SeasonGroup> = {};

  for (const country of countries) {
    const season: number = (country as any).season_number ?? 0;
    if (!seasonGroupsRaw[season]) {
      seasonGroupsRaw[season] = { playable: [], locked: [], silhouette: [] };
    }
    const state = getCountryState(country, tier);
    if (state === "playable") {
      seasonGroupsRaw[season].playable.push(country);
    } else if (state === "locked_upgrade") {
      seasonGroupsRaw[season].locked.push(country);
    } else {
      seasonGroupsRaw[season].silhouette.push(country);
    }
  }

  const sortedSeasons = Object.keys(seasonGroupsRaw).map(Number).sort((a, b) => a - b);

  // Stats
  const allPlayable = countries.filter(c => getCountryState(c, tier) === "playable");
  const completedPlayable = completedCountries.filter(id => allPlayable.some(c => c.id === id));
  const progress = allPlayable.length > 0 ? Math.round((completedPlayable.length / allPlayable.length) * 100) : 0;
  const streak = (profile as any)?.streak ?? 0;

  // Next recommended respects SIGNAL INITIAL sequence (CH→US→CN→BR→EG) for free users
  const nextRecommendedCode = SIGNAL_INITIAL_SEQUENCE.find(code => {
    const country = allPlayable.find(c => c.code === code);
    return country && !completedCountries.includes(country.id);
  });
  const nextRecommended = nextRecommendedCode
    ? allPlayable.find(c => c.code === nextRecommendedCode)
    : allPlayable.find(c => isCountryUnlocked(c, playerLevel) && !completedCountries.includes(c.id));
  const tierLabel = tier === "director" ? "DIRECTEUR" : tier === "season1" ? "OP-01" : tier === "season2" ? "OP-02" : tier === "season3" ? "OP-03" : "EXPLORATEUR";

  // Global progression (out of 195 total countries)
  const globalCompletedCount = completedCountries.length;
  const globalPct = Math.round((globalCompletedCount / TOTAL_COUNTRIES) * 1000) / 10; // 1 decimal
  const progressTitle = getProgressTitle(globalPct);

  // Per-operation completed count
  const opCompletedMap: Record<number, number> = {};
  const opTotalMap: Record<number, number> = {};
  for (const country of countries) {
    const op = (country as any).season_number ?? 0;
    opTotalMap[op] = (opTotalMap[op] ?? 0) + 1;
    if (completedCountries.includes(country.id)) {
      opCompletedMap[op] = (opCompletedMap[op] ?? 0) + 1;
    }
  }

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Cinematic intro overlay */}
      {showIntro && <IntroScreen onComplete={handleIntroComplete} />}

      {/* Upgrade modal */}
      <UpgradeModal
        open={upgradeModal.open}
        type={upgradeModal.type}
        onClose={() => setUpgradeModal(u => ({ ...u, open: false }))}
      />

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors mr-1">
              <Home className="h-4 w-4" />
              <span className="text-xs font-display tracking-wider hidden sm:inline">ACCUEIL</span>
            </Link>
            <span className="text-border">|</span>
            <Shield className="h-6 w-6 text-primary ml-1" />
            <h1 className="font-display text-lg font-bold text-primary tracking-wider">W.E.P.</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Leaderboard button — always visible */}
            <Link to="/leaderboard">
              <Button variant="outline" size="sm" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">CLASSEMENT</span>
              </Button>
            </Link>
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm" className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            )}
            {!isDemo && (
              <div className="text-right hidden sm:block">
                <p className="text-sm text-foreground font-display">Agent {profile?.display_name}</p>
                <p className="text-xs text-muted-foreground">Niveau {profile?.level} · {profile?.xp} XP
                  <span className="ml-2 text-primary font-display">· {tierLabel}</span>
                </p>
              </div>
            )}
            {/* Replay intro — always visible */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReplayIntro}
              title="Revoir l'introduction"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <PlayCircle className="h-5 w-5" />
            </Button>

            {isDemo ? (
              <Link to="/auth">
                <Button size="sm" className="font-display tracking-wider text-xs">CRÉER UN COMPTE</Button>
              </Link>
            ) : (
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Demo CTA banner */}
      {isDemo && (
        <div className="bg-card border-b border-dashed border-primary/40 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground font-display tracking-wider">
              MODE DÉCOUVERTE — Progression temporaire. Créez un compte pour sauvegarder votre avancement.
            </p>
            <Link to="/auth">
              <Button size="sm" variant="outline" className="text-xs font-display tracking-wider border-primary/50 text-primary hover:bg-primary/10 flex-shrink-0">
                S'ENREGISTRER
              </Button>
            </Link>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* ═══════════════════════════════════════════════════════════
            CINEMATIC GLOBAL PROGRESSION
        ════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 rounded-2xl border overflow-hidden"
          style={{
            borderColor: "hsl(40 80% 55% / 0.25)",
            background: "linear-gradient(135deg, hsl(var(--card)), hsl(220 25% 6% / 0.9))",
            boxShadow: "0 0 40px hsl(40 80% 55% / 0.06), inset 0 1px 0 hsl(40 80% 55% / 0.12)",
          }}
        >
          <div className="px-6 pt-6 pb-4">
            {/* Title + Agent info row */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ background: progressTitle.color }}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ repeat: Infinity, duration: 2.2 }}
                  />
                  <span className="text-[10px] font-display tracking-[0.25em]" style={{ color: progressTitle.color }}>
                    STATUT AGENT
                  </span>
                </div>
                <motion.h2
                  key={progressTitle.title}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-2xl md:text-3xl font-display font-bold tracking-widest"
                  style={{ color: progressTitle.color }}
                >
                  {progressTitle.title}
                </motion.h2>
                <p className="text-xs text-muted-foreground font-display tracking-wider mt-0.5 italic">
                  {progressTitle.subtitle}
                </p>
              </div>

              {/* Compact stats row */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {!isDemo && (
                  <>
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-muted-foreground font-display tracking-wider">NIVEAU</p>
                      <p className="text-lg font-display font-bold text-foreground">{playerLevel}</p>
                    </div>
                    <div className="h-8 w-px bg-border hidden sm:block" />
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-muted-foreground font-display tracking-wider">SÉRIE</p>
                      <p className="text-lg font-display font-bold text-foreground flex items-center gap-1">
                        {streak}<span className="text-sm">🔥</span>
                      </p>
                    </div>
                    <div className="h-8 w-px bg-border hidden sm:block" />
                  </>
                )}
                <Link to="/puzzle">
                  <Button size="sm" variant="outline" className="font-display tracking-wider text-xs border-primary/40 text-primary hover:bg-primary/10 gap-2">
                    <Globe className="h-3.5 w-3.5" />
                    CARTE
                  </Button>
                </Link>
              </div>
            </div>

            {/* ─── GLOBAL BAR ─── */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-display tracking-widest text-muted-foreground">🧩 PLAN MONDIAL RÉVÉLÉ</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <motion.span
                    key={globalCompletedCount}
                    initial={{ scale: 1.3, color: "hsl(40 90% 80%)" }}
                    animate={{ scale: 1, color: "hsl(40 85% 62%)" }}
                    transition={{ duration: 0.5 }}
                    className="text-xl font-display font-bold tabular-nums"
                  >
                    {globalCompletedCount}
                  </motion.span>
                  <span className="text-sm font-display text-muted-foreground">/ {TOTAL_COUNTRIES} pays</span>
                  <span className="text-xs font-display tracking-wider ml-2" style={{ color: progressTitle.color }}>
                    {globalPct}%
                  </span>
                </div>
              </div>

              {/* Luminous progress bar */}
              <div className="h-3 rounded-full bg-secondary/80 overflow-hidden relative border border-border/30">
                <motion.div
                  className="h-full rounded-full relative overflow-hidden"
                  style={{
                    background: `linear-gradient(90deg, hsl(30 75% 40%), hsl(40 90% 62%), hsl(45 95% 72%))`,
                    boxShadow: `0 0 16px hsl(40 85% 55% / 0.6), 0 0 4px hsl(40 90% 72% / 0.8)`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(globalPct, 100)}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                >
                  {/* Shimmer sweep */}
                  <motion.div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(90deg, transparent 0%, hsl(40 100% 85% / 0.5) 50%, transparent 100%)" }}
                    animate={{ x: ["-100%", "250%"] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: "linear", repeatDelay: 1 }}
                  />
                </motion.div>

                {/* Threshold markers */}
                {[10, 25, 50, 75].map(t => (
                  <div
                    key={t}
                    className="absolute top-0 bottom-0 w-px"
                    style={{
                      left: `${t}%`,
                      background: "hsl(220 20% 30% / 0.5)",
                    }}
                  />
                ))}
              </div>

              {/* Threshold labels */}
              <div className="flex justify-between mt-1 px-0.5">
                {[0, 10, 25, 50, 75, 100].map(t => (
                  <span
                    key={t}
                    className="text-[9px] font-display"
                    style={{ color: globalPct >= t ? "hsl(40 60% 55%)" : "hsl(220 10% 30%)" }}
                  >
                    {t}%
                  </span>
                ))}
              </div>
            </div>

            {/* Narrative flavor text */}
            <AnimatePresence mode="wait">
              <motion.p
                key={Math.floor(globalPct / 10)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-[11px] font-display tracking-wider italic mt-3 text-center"
                style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}
              >
                {globalPct === 0
                  ? "« L'enquête commence. Le réseau attend d'être découvert. »"
                  : globalPct < 10
                  ? "« Quelque chose se dessine dans l'ombre… »"
                  : globalPct < 25
                  ? "« Les premiers réseaux lumineux apparaissent. »"
                  : globalPct < 50
                  ? "« Un motif prend forme. Continuez. »"
                  : globalPct < 75
                  ? "« Le réseau mondial devient visible. Vous approchez de la vérité. »"
                  : globalPct < 100
                  ? "« Le schéma est presque complet. La révélation est imminente. »"
                  : "« Le plan est révélé. Vous êtes Maître du Protocole. »"}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Bottom stat strip */}
          <div
            className="px-6 py-3 flex items-center justify-between gap-4 border-t"
            style={{ borderColor: "hsl(40 80% 55% / 0.12)", background: "hsl(220 25% 4% / 0.4)" }}
          >
            <div className="flex items-center gap-6 text-[11px] font-display tracking-wider">
              <span style={{ color: "hsl(40 80% 60%)" }}>🌍 {globalCompletedCount} pays validés</span>
              <span className="text-muted-foreground hidden sm:inline">·</span>
              <span className="text-muted-foreground hidden sm:inline">
                {TOTAL_COUNTRIES - globalCompletedCount} restants
              </span>
              {!isDemo && profile && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{profile.xp} XP total</span>
                </>
              )}
            </div>
            <Link to="/puzzle" className="text-[10px] font-display tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              VOIR LA CARTE
            </Link>
            {/* Leaderboard visibility toggle */}
            {!isDemo && (
              <button
                onClick={handleLeaderboardToggle}
                disabled={leaderboardTogglingLoading}
                className="flex items-center gap-1.5 text-[10px] font-display tracking-wider transition-colors"
                style={{ color: leaderboardVisible ? "hsl(var(--gold-glow))" : "hsl(var(--muted-foreground))" }}
                title={leaderboardVisible ? "Visible dans le classement — cliquer pour masquer" : "Masqué du classement — cliquer pour apparaître"}
              >
                <Users className="h-3 w-3" />
                <span className="hidden sm:inline">{leaderboardVisible ? "CLASSEMENT VISIBLE" : "CLASSEMENT MASQUÉ"}</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Badges */}
        {userBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h2 className="text-sm font-display text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              BADGES DÉBLOQUÉS ({userBadges.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {userBadges.map(key => {
                const meta = BADGE_META[key];
                if (!meta) return null;
                return (
                  <div key={key} title={meta.description} className="flex items-center gap-2 bg-card border border-primary/20 rounded-full px-3 py-1.5 text-xs font-display tracking-wider text-primary">
                    <span>{meta.icon}</span>
                    <span>{meta.name}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Collected Tokens (Letters) */}
        {userTokens.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            {(() => {
              const allSignalCollected = SIGNAL_INITIAL_SEQUENCE.every(code =>
                userTokens.some(t => t.country_code === code)
              );
              return (
                <>
                  <h2 className="text-sm font-display text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
                    <Puzzle className="h-4 w-4" />
                    TOKENS COLLECTÉS ({userTokens.length}/{SIGNAL_INITIAL_SEQUENCE.length})
                    {!allSignalCollected && userTokens.length > 0 && (
                      <span className="text-[9px] tracking-wider ml-2" style={{ color: "hsl(40 60% 50%)" }}>
                        — COMPLÉTEZ LES 5 POUR RÉVÉLER
                      </span>
                    )}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {SIGNAL_INITIAL_SEQUENCE.map(code => {
                      const token = userTokens.find(t => t.country_code === code);
                      const countryName = countries.find(c => c.code === code)?.name ?? code;
                      const isRevealed = allSignalCollected && !!token;
                      return (
                        <motion.div
                          key={code}
                          className="flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 min-w-[70px]"
                          style={{
                            borderColor: token
                              ? isRevealed ? "hsl(40 80% 55% / 0.6)" : "hsl(40 80% 55% / 0.25)"
                              : "hsl(var(--border) / 0.3)",
                            background: token
                              ? isRevealed ? "hsl(40 80% 55% / 0.1)" : "hsl(40 80% 55% / 0.04)"
                              : "hsl(var(--card))",
                            boxShadow: isRevealed ? "0 0 16px hsl(40 80% 55% / 0.2)" : "none",
                          }}
                          animate={isRevealed ? { scale: [1, 1.08, 1] } : {}}
                          transition={{ duration: 0.6, delay: SIGNAL_INITIAL_SEQUENCE.indexOf(code) * 0.15 }}
                        >
                          <span
                            className="text-2xl font-display font-bold"
                            style={{
                              color: isRevealed
                                ? "hsl(40 85% 62%)"
                                : token ? "hsl(40 60% 40%)" : "hsl(var(--muted-foreground) / 0.25)",
                              filter: token && !isRevealed ? "blur(6px)" : "none",
                              userSelect: "none",
                            }}
                          >
                            {token ? token.letter : "?"}
                          </span>
                          <span className="text-[9px] font-display tracking-wider text-muted-foreground">
                            {countryName.toUpperCase().slice(0, 6)}
                          </span>
                          {token && !isRevealed && (
                            <span className="text-[7px] font-display tracking-wider" style={{ color: "hsl(40 60% 50%)" }}>
                              MASQUÉ
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}

        {/* Next recommended */}
        {nextRecommended && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="mb-8 bg-card border border-primary/30 rounded-lg p-5 border-glow flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-xs font-display text-primary tracking-wider mb-1">PROCHAINE MISSION RECOMMANDÉE</p>
              <p className="text-lg font-display font-bold text-foreground">{nextRecommended.name.toUpperCase()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{"★".repeat(nextRecommended.difficulty_base)} · {nextRecommended.description?.slice(0, 60) || "Mission disponible"}</p>
            </div>
            <Link
              to={((nextRecommended as any).season_number === 0)
                ? `/free-mission/${nextRecommended.id}`
                : `/mission/${nextRecommended.id}`}
              className="flex-shrink-0"
            >
              <Button className="font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                DÉMARRER
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Dilemme Central CTA — visible when all 5 free countries are completed */}
        {!nextRecommended && tier === "free" && (() => {
          const allFreeCompleted = SIGNAL_INITIAL_SEQUENCE.every(code => {
            const c = countries.find(ct => ct.code === code);
            return c && completedCountries.includes(c.id);
          });
          if (!allFreeCompleted) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="mb-8 rounded-xl overflow-hidden border border-primary/40"
              style={{
                background: "linear-gradient(135deg, hsl(220 25% 7%), hsl(220 20% 5%))",
                boxShadow: "0 0 40px hsl(40 80% 55% / 0.12)",
              }}
            >
              <div className="p-6 flex flex-col sm:flex-row items-center gap-5">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                  className="text-5xl text-primary flex-shrink-0"
                >
                  ◈
                </motion.div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-[10px] font-display tracking-[0.4em] text-primary/60 mb-1">SIGNAL INITIAL — COMPLÉTÉ</p>
                  <h3 className="text-xl font-display font-bold text-primary tracking-wider mb-1">DILEMME CENTRAL</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tu as identifié cinq leviers. Mais tout système a une origine.<br />
                    Trouve le point central pour débloquer la suite.
                  </p>
                </div>
                <Link to="/dilemme-central" className="flex-shrink-0">
                  <Button className="font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                    ACCÉDER
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          );
        })()}

        {/* ====== OPERATIONS ====== */}
        {sortedSeasons.map((seasonNum, idx) => {
          const group = seasonGroupsRaw[seasonNum];
          const meta = SEASON_META[seasonNum] ?? {
            label: `OPÉRATION ${seasonNum}`,
            codename: `OP-0${seasonNum}`,
            subtitle: "Bientôt disponible",
            theme: "",
            reward: "",
            rewardIcon: "🔒",
            accentColor: "hsl(220 20% 50%)",
          };
          const isUnlocked = seasonNum <= maxSeason;
          const totalInSeason = group.playable.length + group.locked.length + group.silhouette.length;
          if (totalInSeason === 0) return null;

          // Per-operation progress
          const opCompleted = opCompletedMap[seasonNum] ?? 0;
          const opTotal = opTotalMap[seasonNum] ?? totalInSeason;
          const opPct = opTotal > 0 ? (opCompleted / opTotal) * 100 : 0;
          const isOpComplete = isUnlocked && opCompleted >= opTotal && opTotal > 0;

          return (
            <motion.div
              key={seasonNum}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="mb-14"
            >
              {/* Operation Banner */}
              <div
                className="rounded-xl mb-6 overflow-hidden border"
                style={{
                  borderColor: isUnlocked ? meta.accentColor.replace(")", " / 0.35)") : "hsl(var(--border) / 0.4)",
                  background: isUnlocked
                    ? `linear-gradient(135deg, hsl(var(--card)), ${meta.accentColor.replace(")", " / 0.06)")})`
                    : "hsl(var(--card))",
                }}
              >
                <div className="px-6 py-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Operation icon */}
                    <div
                      className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl border"
                      style={{
                        background: isUnlocked ? meta.accentColor.replace(")", " / 0.12)") : "hsl(var(--secondary))",
                        borderColor: isUnlocked ? meta.accentColor.replace(")", " / 0.4)") : "hsl(var(--border) / 0.3)",
                        boxShadow: isUnlocked ? `0 0 18px ${meta.accentColor.replace(")", " / 0.2)")}` : "none",
                      }}
                    >
                      {isUnlocked ? meta.rewardIcon : "🔒"}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Codename */}
                      <p
                        className="text-[10px] font-display tracking-[0.2em] mb-0.5"
                        style={{ color: isUnlocked ? meta.accentColor : "hsl(var(--muted-foreground) / 0.5)" }}
                      >
                        {meta.codename}
                      </p>
                      {/* Operation Name */}
                      <h2
                        className="text-xl font-display font-bold tracking-wider truncate"
                        style={{ color: isUnlocked ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground) / 0.55)" }}
                      >
                        {meta.label}
                      </h2>
                      {/* Subtitle */}
                      <p className="text-xs text-muted-foreground font-display tracking-wider mt-0.5">{meta.subtitle}</p>
                      {/* Theme */}
                      {meta.theme && (
                        <p className="text-[11px] mt-2 italic" style={{ color: isUnlocked ? meta.accentColor.replace(")", " / 0.7)") : "hsl(var(--muted-foreground) / 0.4)" }}>
                          {meta.theme}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right side: CTA or progress */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    {!isUnlocked && meta.price && meta.upgradeType ? (
                      <button
                        onClick={() => setUpgradeModal({ open: true, type: meta.upgradeType === "director" ? "director" : "agent" })}
                        className="flex items-center gap-2 text-xs font-display tracking-wider px-4 py-2.5 rounded-lg border transition-all hover:scale-105 active:scale-95"
                        style={{
                          borderColor: meta.accentColor.replace(")", " / 0.5)"),
                          color: meta.accentColor,
                          background: meta.accentColor.replace(")", " / 0.08)"),
                          boxShadow: `0 0 12px ${meta.accentColor.replace(")", " / 0.15)")}`,
                        }}
                      >
                        <Lock className="h-3.5 w-3.5" />
                        {meta.price === "À venir" ? "BIENTÔT" : `DÉBLOQUER · ${meta.price}`}
                        {meta.price !== "À venir" && <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    ) : isUnlocked ? (
                      <span
                        className="text-xs font-display tracking-wider px-3 py-1 rounded-full border"
                        style={{ borderColor: meta.accentColor.replace(")", " / 0.4)"), color: meta.accentColor }}
                      >
                        {group.playable.length} PAYS ACTIFS
                      </span>
                    ) : null}

                    {/* Reward */}
                    <div
                      className="text-[10px] font-display tracking-wider px-2.5 py-1 rounded-lg border text-right"
                      style={{
                        borderColor: isUnlocked ? meta.accentColor.replace(")", " / 0.25)") : "hsl(var(--border) / 0.2)",
                        color: isUnlocked ? meta.accentColor.replace(")", " / 0.8)") : "hsl(var(--muted-foreground) / 0.4)",
                        background: isUnlocked ? meta.accentColor.replace(")", " / 0.05)") : "transparent",
                      }}
                    >
                      🎁 {meta.reward}
                    </div>
                </div>
              </div>

              {/* ── Operation progress bar (bottom of banner) ── */}
              {isUnlocked && (
                <div
                  className="px-6 py-3 border-t"
                  style={{ borderColor: meta.accentColor.replace(")", " / 0.15)") }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {isOpComplete ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-1.5 text-[11px] font-display tracking-wider"
                          style={{ color: meta.accentColor }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          OPÉRATION VALIDÉE
                        </motion.div>
                      ) : (
                        <span className="text-[11px] font-display tracking-wider text-muted-foreground">
                          PROGRESSION DE L'OPÉRATION
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-display tabular-nums" style={{ color: meta.accentColor }}>
                      {opCompleted} / {opTotal} pays
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${meta.accentColor.replace(")", " / 0.6)")}, ${meta.accentColor})`,
                        boxShadow: isOpComplete ? `0 0 8px ${meta.accentColor}` : "none",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${opPct}%` }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.15 * idx }}
                    />
                  </div>
                </div>
              )}
            </div>

              {/* Playable countries */}
              {group.playable.length > 0 && (() => {
                // For Signal Initial (season 0): sort by sequence and display horizontally
                const isSignalInitialGroup = seasonNum === 0;

                // Sort season 0 countries in SIGNAL_INITIAL_SEQUENCE order
                const sortedPlayable = isSignalInitialGroup
                  ? [...group.playable].sort((a, b) => {
                      const ia = SIGNAL_INITIAL_SEQUENCE.indexOf(a.code);
                      const ib = SIGNAL_INITIAL_SEQUENCE.indexOf(b.code);
                      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                    })
                  : group.playable;

                // Compute nextUnlockedCode for pulsing highlight
                // For season 0 (FREE format), a country is "done" if it appears in completedCountries
                const nextUnlockedCode = isSignalInitialGroup
                  ? SIGNAL_INITIAL_SEQUENCE.find((code) => {
                      const c = group.playable.find((p) => p.code === code);
                      if (!c) return false;
                      const idx = SIGNAL_INITIAL_SEQUENCE.indexOf(code);
                      const prev = idx > 0 ? SIGNAL_INITIAL_SEQUENCE[idx - 1] : null;
                      // Previous country is "done" if it appears in completedCountries (mission saved)
                      const prevDone = prev
                        ? completedCountries.includes(group.playable.find(p => p.code === prev)?.id ?? "")
                        : true;
                      const locked = idx > 0 && !prevDone;
                      const done = completedCountries.includes(c.id);
                      return !locked && !done;
                    })
                  : null;

                return (
                  <div
                    className={
                      isSignalInitialGroup
                        ? "flex flex-row gap-4 overflow-x-auto pb-4 mb-6 scroll-gold"
                        : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6"
                    }
                  >
                    {sortedPlayable.map((country, i) => {
                      const levelOk = isCountryUnlocked(country, playerLevel);
                      const requiredLevel = (country.difficulty_base - 1) * 2 + 1;

                      // ── SIGNAL_INITIAL sequential lock ──────────────────────
                      // For FREE format (season 0), unlock is based on mission completion
                      // not on score (since format changed from 6 questions to 3 steps)
                      const seqIdx = SIGNAL_INITIAL_SEQUENCE.indexOf(country.code);
                      const isSignalInitial = seasonNum === 0 && seqIdx !== -1;
                      const prevCode = seqIdx > 0 ? SIGNAL_INITIAL_SEQUENCE[seqIdx - 1] : null;
                      const prevCountry = prevCode ? group.playable.find(p => p.code === prevCode) : null;
                      const prevDone = prevCountry ? completedCountries.includes(prevCountry.id) : true;
                      const seqLocked = isSignalInitial && seqIdx > 0 && !prevDone;

                      // Any season-0 country NOT in SIGNAL_INITIAL_SEQUENCE is locked
                      // until the full 5-country sequence is completed
                      const allSeqDone = SIGNAL_INITIAL_SEQUENCE.every(code => {
                        const c = group.playable.find(p => p.code === code);
                        return c ? completedCountries.includes(c.id) : false;
                      });
                      const outsideSeqLocked = seasonNum === 0 && seqIdx === -1 && !allSeqDone;

                      const isNext = isSignalInitialGroup && country.code === nextUnlockedCode;

                      const cardWrapper = (children: React.ReactNode) =>
                        isSignalInitialGroup ? (
                          <div className="min-w-[280px] w-[280px] flex-shrink-0">{children}</div>
                        ) : (
                          <>{children}</>
                        );

                        if (seqLocked || outsideSeqLocked) {
                        const lockMsg = outsideSeqLocked
                          ? "COMPLÈTE LES 5 MISSIONS SIGNAL INITIAL"
                          : `RÉUSSIS ${prevCode} AVEC 5/6`;
                        const lockScore = outsideSeqLocked ? null : `Score actuel : ${signalProgress[prevCode!] ?? 0}/6`;
                        return (
                          <motion.div key={country.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4, delay: 0.04 * i }}>
                            {cardWrapper(
                              <div className="relative bg-card border border-border rounded-xl p-5 select-none overflow-hidden h-full">
                                {/* Blur overlay */}
                                <div className="absolute inset-0 backdrop-blur-[4px] bg-background/65 rounded-xl z-10 flex flex-col items-center justify-center gap-2 px-4 text-center">
                                  <Lock className="h-6 w-6 text-muted-foreground mb-1" />
                                  <p className="text-xs font-display text-muted-foreground tracking-wider">
                                    {lockMsg}
                                  </p>
                                  {lockScore && (
                                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                                      {lockScore}
                                    </p>
                                  )}
                                </div>
                                <div className="opacity-30">
                                  <p className="font-display text-foreground tracking-wider mb-1">{country.name.toUpperCase()}</p>
                                  <p className="text-xs text-muted-foreground">{"★".repeat(Math.max(0, Math.min(5, country.difficulty_base)))}</p>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      }

                      if (!levelOk && !isSignalInitial) {
                        return (
                          <motion.div key={country.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                            {cardWrapper(
                              <div className="relative bg-card border border-border rounded-xl p-5 opacity-60 select-none">
                                <div className="absolute inset-0 bg-background/40 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                  <div className="text-center">
                                    <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-xs font-display text-muted-foreground tracking-wider">NIVEAU {requiredLevel} REQUIS</p>
                                  </div>
                                </div>
                                <p className="font-display text-foreground tracking-wider mb-1">{country.name.toUpperCase()}</p>
                                <p className="text-xs text-muted-foreground">{"★".repeat(Math.max(0, Math.min(5, country.difficulty_base)))}</p>
                              </div>
                            )}
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          key={country.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-40px" }}
                          animate={
                            isNext
                              ? {
                                  boxShadow: [
                                    "0 0 0px hsl(40 80% 55% / 0)",
                                    "0 0 22px hsl(40 80% 55% / 0.65)",
                                    "0 0 0px hsl(40 80% 55% / 0)",
                                  ],
                                }
                              : {}
                          }
                          transition={
                            isNext
                              ? { duration: 0.4, delay: 0.04 * i, boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" } }
                              : { duration: 0.4, delay: 0.04 * i }
                          }
                          className={isSignalInitialGroup ? "min-w-[280px] w-[280px] flex-shrink-0 rounded-xl" : ""}
                        >
                          <CountryCard
                            country={country}
                            completed={completedCountries.includes(country.id)}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Locked upgrade countries */}
              {group.locked.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                  {group.locked.map((country, i) => (
                    <motion.div key={country.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4, delay: 0.04 * i }}>
                      <button
                        onClick={() => setUpgradeModal({ open: true, type: tier === "season1" ? "director" : "agent" })}
                        className="w-full text-left group relative bg-card border border-primary/20 rounded-xl p-6 cursor-pointer hover:border-primary/50 transition-all duration-300"
                      >
                        <div className="absolute inset-0 rounded-xl bg-primary/5" />
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-3">
                            <FlagImage code={country.code} size={48} className="opacity-60 rounded-md" />
                            <div>
                              <h3 className="font-display font-bold text-foreground tracking-wider text-lg">{country.name.toUpperCase()}</h3>
                              <p className="text-xs text-primary font-display">{"★".repeat(country.difficulty_base)}</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{country.description}</p>
                          <div className="flex items-center gap-2 text-xs font-display text-primary tracking-wider">
                            <Shield className="h-3.5 w-3.5" />
                            ÉLEVER VOTRE AUTORISATION
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Silhouette countries */}
              {group.silhouette.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {group.silhouette.map((country, i) => (
                    <motion.div key={country.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4, delay: 0.03 * i }}>
                      <div
                        className="relative bg-card border border-border/30 rounded-xl p-6 cursor-pointer select-none overflow-hidden"
                        onClick={() => setUpgradeModal({ open: true, type: "agent" })}
                      >
                        <div className="absolute inset-0 backdrop-blur-[3px] bg-background/70 rounded-xl z-10 flex flex-col items-center justify-center gap-2">
                          <Eye className="h-5 w-5 opacity-20" />
                          <p className="text-xs font-display text-muted-foreground/50 tracking-[0.3em]">CLASSIFIÉ</p>
                        </div>
                        <div className="opacity-15">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">🌍</span>
                            <div>
                              <h3 className="font-display font-bold text-foreground tracking-wider text-lg">██████████</h3>
                              <p className="text-xs text-muted-foreground">★★★★</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">████████████ █████ ██████████████</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </main>
    </div>
  );
};

export default Dashboard;
