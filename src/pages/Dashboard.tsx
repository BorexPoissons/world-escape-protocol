import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Globe, LogOut, Shield, Star, Map, Puzzle, Home, Lock, Flame, Trophy, Eye, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import CountryCard from "@/components/CountryCard";
import type { Tables } from "@/integrations/supabase/types";
import { BADGE_META, type BadgeKey } from "@/lib/badges";
import UpgradeModal from "@/components/UpgradeModal";

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

// Season metadata
const SEASON_META: Record<number, { label: string; subtitle: string; price?: string; upgradeType?: "season1" | "season2" | "season3" | "director" }> = {
  0: { label: "ACCÈS GRATUIT", subtitle: "5 pays — Introduction à l'enquête" },
  1: { label: "SAISON 1 — MISSION OMÉGA", subtitle: "43 pays · Opération mondiale", price: "19.90 CHF", upgradeType: "season1" },
  2: { label: "SAISON 2", subtitle: "50 pays · Bientôt disponible", price: "À venir", upgradeType: "season2" },
  3: { label: "SAISON 3", subtitle: "50 pays · Bientôt disponible", price: "À venir", upgradeType: "season3" },
  4: { label: "SAISON 4", subtitle: "47 pays · Bientôt disponible", price: "À venir", upgradeType: "director" },
};

const FLAG_EMOJI: Record<string, string> = {
  CH: "🇨🇭", JP: "🇯🇵", EG: "🇪🇬", FR: "🇫🇷", DE: "🇩🇪",
  IT: "🇮🇹", ES: "🇪🇸", GB: "🇬🇧", BR: "🇧🇷", US: "🇺🇸",
  CA: "🇨🇦", AU: "🇦🇺", CN: "🇨🇳", IN: "🇮🇳", MX: "🇲🇽",
  RU: "🇷🇺", ZA: "🇿🇦", MA: "🇲🇦", TR: "🇹🇷", AR: "🇦🇷",
  KR: "🇰🇷", GR: "🇬🇷", PT: "🇵🇹", NL: "🇳🇱", SE: "🇸🇪",
};

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [completedCountries, setCompletedCountries] = useState<string[]>([]);
  const [userBadges, setUserBadges] = useState<BadgeKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; type: "agent" | "director" }>({
    open: false,
    type: "agent",
  });
  const isDemo = !user;

  useEffect(() => {
    if (!user) {
      const fetchCountries = async () => {
        const { data } = await supabase.from("countries").select("*").order("release_order");
        if (data) setCountries(data as CountryRow[]);
        setLoading(false);
      };
      fetchCountries();
      return;
    }

    const fetchData = async () => {
      const [countriesRes, profileRes, missionsRes, rolesRes, badgesRes] = await Promise.all([
        supabase.from("countries").select("*").order("release_order"),
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("missions").select("country_id").eq("user_id", user.id).eq("completed", true),
        supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin"),
        supabase.from("user_badges").select("badge_key").eq("user_id", user.id),
      ]);

      if (countriesRes.data) setCountries(countriesRes.data as CountryRow[]);
      if (profileRes.data) setProfile(profileRes.data as any);
      if (missionsRes.data) setCompletedCountries(missionsRes.data.map((m: any) => m.country_id));
      if (rolesRes.data && rolesRes.data.length > 0) setIsAdmin(true);
      if (badgesRes.data) setUserBadges(badgesRes.data.map((b: any) => b.badge_key));
      setLoading(false);
    };

    fetchData();
  }, [user]);

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

  const nextRecommended = allPlayable.find(c => isCountryUnlocked(c, playerLevel) && !completedCountries.includes(c.id));
  const tierLabel = tier === "director" ? "DIRECTEUR" : tier === "season1" ? "SAISON 1" : tier === "season2" ? "SAISON 2" : tier === "season3" ? "SAISON 3" : "EXPLORATEUR";

  return (
    <div className="min-h-screen bg-background bg-grid">
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
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Link to="/puzzle" className="block">
            <div className="bg-card border border-border rounded-lg p-5 border-glow hover:border-primary/50 transition-all cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <Puzzle className="h-5 w-5 text-primary" />
                <span className="text-xs text-muted-foreground font-display tracking-wider">PUZZLE</span>
              </div>
              <p className="text-3xl font-display font-bold text-foreground">{progress}%</p>
              <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </Link>

          <div className="bg-card border border-border rounded-lg p-5 border-glow">
            <div className="flex items-center gap-3 mb-2">
              <Map className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground font-display tracking-wider">PAYS</span>
            </div>
            <p className="text-3xl font-display font-bold text-foreground">
              {completedPlayable.length}<span className="text-muted-foreground text-lg">/{allPlayable.length}</span>
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 border-glow">
            <div className="flex items-center gap-3 mb-2">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground font-display tracking-wider">NIVEAU</span>
            </div>
            <p className="text-3xl font-display font-bold text-foreground">{playerLevel}</p>
            {!isDemo && profile && (
              <p className="text-xs text-muted-foreground mt-1">{profile.xp} XP total</p>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-5 border-glow">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground font-display tracking-wider">SÉRIE</span>
            </div>
            <p className="text-3xl font-display font-bold text-foreground">{streak}</p>
            <p className="text-xs text-muted-foreground mt-1">missions consécutives</p>
          </div>
        </motion.div>

        {/* Badges */}
        {userBadges.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-8">
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

        {/* Next recommended */}
        {nextRecommended && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-8 bg-card border border-primary/30 rounded-lg p-5 border-glow flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-xs font-display text-primary tracking-wider mb-1">PROCHAINE MISSION RECOMMANDÉE</p>
              <p className="text-lg font-display font-bold text-foreground">{nextRecommended.name.toUpperCase()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{"★".repeat(nextRecommended.difficulty_base)} · {nextRecommended.description?.slice(0, 60) || "Mission disponible"}</p>
            </div>
            <Link to={`/mission/${nextRecommended.id}`} className="flex-shrink-0">
              <Button className="font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                DÉMARRER
              </Button>
            </Link>
          </motion.div>
        )}

        {/* ====== SEASONS ====== */}
        {sortedSeasons.map((seasonNum, idx) => {
          const group = seasonGroupsRaw[seasonNum];
          const meta = SEASON_META[seasonNum] ?? { label: `SAISON ${seasonNum}`, subtitle: "Bientôt disponible" };
          const isUnlocked = seasonNum <= maxSeason;
          const totalInSeason = group.playable.length + group.locked.length + group.silhouette.length;
          if (totalInSeason === 0) return null;

          return (
            <motion.div
              key={seasonNum}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="mb-12"
            >
              {/* Season banner */}
              <div className={`flex items-center justify-between mb-6 pb-4 border-b ${isUnlocked ? "border-primary/30" : "border-border/40"}`}>
                <div className="flex items-center gap-3">
                  {isUnlocked ? (
                    <Globe className="h-5 w-5 text-primary" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground/50" />
                  )}
                  <div>
                    <h2 className={`text-lg font-display font-bold tracking-wider ${isUnlocked ? "text-foreground" : "text-muted-foreground/60"}`}>
                      {meta.label}
                    </h2>
                    <p className="text-xs text-muted-foreground font-display tracking-wider">{meta.subtitle}</p>
                  </div>
                </div>

                {/* Unlock CTA for locked seasons */}
                {!isUnlocked && meta.price && meta.upgradeType && (
                  <button
                    onClick={() => setUpgradeModal({ open: true, type: meta.upgradeType === "director" ? "director" : "agent" })}
                    className="flex items-center gap-2 text-xs font-display tracking-wider px-4 py-2 rounded-lg border transition-all hover:bg-primary/10"
                    style={{ borderColor: "hsl(var(--primary) / 0.3)", color: "hsl(var(--primary))" }}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    DÉBLOQUER · {meta.price}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}

                {isUnlocked && (
                  <span className="text-xs font-display text-primary tracking-wider px-3 py-1 rounded-full border border-primary/30">
                    {group.playable.length} PAYS ACCESSIBLES
                  </span>
                )}
              </div>

              {/* Playable countries grid */}
              {group.playable.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                  {group.playable.map((country, i) => {
                    const levelOk = isCountryUnlocked(country, playerLevel);
                    const requiredLevel = (country.difficulty_base - 1) * 2 + 1;
                    if (!levelOk) {
                      // Level-locked within playable season
                      return (
                        <motion.div key={country.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                          <div className="relative bg-card border border-border rounded-xl p-5 opacity-60 select-none">
                            <div className="absolute inset-0 bg-background/40 rounded-xl flex items-center justify-center backdrop-blur-sm">
                              <div className="text-center">
                                <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                                <p className="text-xs font-display text-muted-foreground tracking-wider">NIVEAU {requiredLevel} REQUIS</p>
                              </div>
                            </div>
                            <p className="font-display text-foreground tracking-wider mb-1">{country.name.toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground">{"★".repeat(country.difficulty_base)}</p>
                          </div>
                        </motion.div>
                      );
                    }
                    return (
                      <motion.div key={country.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                        <CountryCard country={country} completed={completedCountries.includes(country.id)} />
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Locked upgrade countries (first country of next paywall) */}
              {group.locked.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                  {group.locked.map((country, i) => (
                    <motion.div key={country.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                      <button
                        onClick={() => setUpgradeModal({ open: true, type: tier === "season1" ? "director" : "agent" })}
                        className="w-full text-left group relative bg-card border border-primary/20 rounded-xl p-6 cursor-pointer hover:border-primary/50 transition-all duration-300"
                      >
                        <div className="absolute inset-0 rounded-xl bg-primary/5" />
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl opacity-60">{FLAG_EMOJI[country.code] ?? "🌍"}</span>
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
                    <motion.div key={country.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.03 * i }}>
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
