import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Globe, LogOut, Shield, Star, Map, Puzzle, Home, Lock, Flame, Trophy, Eye } from "lucide-react";
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
};

// --- Subscription tier helpers ---
type Tier = "free" | "agent" | "director";

function getTier(profile: ProfileData | null): Tier {
  const sub = (profile as any)?.subscription_type ?? "free";
  if (sub === "director") return "director";
  if (sub === "agent") return "agent";
  return "free";
}

type CountryVisibility = "playable" | "locked_upgrade" | "silhouette" | "hidden";

function getCountryVisibility(country: CountryRow, tier: Tier): CountryVisibility {
  const order = country.release_order ?? 999;
  const isSecret = country.is_secret ?? false;

  if (tier === "director") {
    return "playable";
  }

  if (tier === "agent") {
    if (isSecret) return "hidden";
    if (order <= 50) return "playable";
    if (order === 51) return "locked_upgrade";
    if (order <= 60) return "silhouette";
    return "hidden";
  }

  // free
  if (isSecret) return "hidden";
  if (order <= 3) return "playable";
  if (order === 4) return "locked_upgrade";
  if (order <= 10) return "silhouette";
  return "hidden";
}

// Level-based unlock (existing logic kept for playable countries)
function isCountryUnlocked(country: CountryRow, playerLevel: number): boolean {
  const requiredLevel = (country.difficulty_base - 1) * 2 + 1;
  return playerLevel >= requiredLevel;
}

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

  // Apply visibility filter
  const visibleCountries = countries.filter(c => getCountryVisibility(c, tier) !== "hidden");
  const playableCountries = visibleCountries.filter(c => getCountryVisibility(c, tier) === "playable");
  const lockedUpgradeCountries = visibleCountries.filter(c => getCountryVisibility(c, tier) === "locked_upgrade");
  const silhouetteCountries = visibleCountries.filter(c => getCountryVisibility(c, tier) === "silhouette");

  // Level-gated within playable
  const unlockedCountries = playableCountries.filter(c => isCountryUnlocked(c, playerLevel));
  const levelLockedCountries = playableCountries.filter(c => !isCountryUnlocked(c, playerLevel));

  const progress = playableCountries.length > 0
    ? Math.round((completedCountries.filter(id => playableCountries.some(c => c.id === id)).length / playableCountries.length) * 100)
    : 0;
  const streak = (profile as any)?.streak ?? 0;

  const nextRecommended = unlockedCountries.find(c => !completedCountries.includes(c.id));

  const tierLabel = tier === "director" ? "DIRECTEUR" : tier === "agent" ? "AGENT" : "EXPLORATEUR";

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
              {completedCountries.length}<span className="text-muted-foreground text-lg">/{unlockedCountries.length}</span>
            </p>
            {levelLockedCountries.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{levelLockedCountries.length} verrouillés</p>
            )}
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

        {/* === PLAYABLE COUNTRIES === */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="text-xl font-display font-bold text-foreground tracking-wider mb-6">
            OPÉRATIONS DISPONIBLES ({unlockedCountries.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {unlockedCountries.map((country, i) => (
              <motion.div key={country.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * Math.min(i, 5) }}>
                <CountryCard country={country} completed={completedCountries.includes(country.id)} />
              </motion.div>
            ))}
          </div>

          {/* Level-locked within playable tier */}
          {levelLockedCountries.length > 0 && (
            <>
              <h2 className="text-xl font-display font-bold text-muted-foreground tracking-wider mb-6 flex items-center gap-2">
                <Lock className="h-5 w-5" />
                NIVEAU REQUIS ({levelLockedCountries.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {levelLockedCountries.map((country, i) => {
                  const requiredLevel = (country.difficulty_base - 1) * 2 + 1;
                  return (
                    <motion.div key={country.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * Math.min(i, 8) }}>
                      <div className="relative bg-card border border-border rounded-lg p-5 opacity-60 select-none">
                        <div className="absolute inset-0 bg-background/40 rounded-lg flex items-center justify-center backdrop-blur-sm">
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
                })}
              </div>
            </>
          )}

          {/* === UPGRADE-LOCKED COUNTRIES === */}
          {lockedUpgradeCountries.length > 0 && (
            <>
              <h2 className="text-xl font-display font-bold text-muted-foreground tracking-wider mb-6 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                AUTORISATION REQUISE
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {lockedUpgradeCountries.map((country, i) => {
                  const upgradeType = tier === "agent" ? "director" : "agent";
                  return (
                    <motion.div key={country.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                      <button
                        onClick={() => setUpgradeModal({ open: true, type: upgradeType })}
                        className="w-full text-left group relative bg-card border border-primary/20 rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-all duration-300"
                      >
                        <div className="absolute inset-0 rounded-lg bg-primary/5" />
                        <div className="relative">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl opacity-60">{country.code === "CH" ? "🇨🇭" : country.code === "JP" ? "🇯🇵" : country.code === "EG" ? "🇪🇬" : "🌍"}</span>
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
                  );
                })}
              </div>
            </>
          )}

          {/* === SILHOUETTE COUNTRIES === */}
          {silhouetteCountries.length > 0 && (
            <>
              <h2 className="text-xl font-display font-bold text-muted-foreground tracking-wider mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5 opacity-40" />
                <span className="opacity-40">OPÉRATIONS CLASSIFIÉES ({silhouetteCountries.length})</span>
              </h2>
              <p className="text-xs text-muted-foreground font-display tracking-wider mb-6 opacity-50">
                CES DESTINATIONS EXISTENT. VOUS N'AVEZ PAS LES ACCRÉDITATIONS POUR Y ACCÉDER.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {silhouetteCountries.map((country, i) => (
                  <motion.div key={country.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.03 * i }}>
                    <div
                      className="relative bg-card border border-border/30 rounded-lg p-6 cursor-pointer select-none overflow-hidden"
                      onClick={() => setUpgradeModal({ open: true, type: tier === "agent" ? "director" : "agent" })}
                    >
                      {/* Blur overlay */}
                      <div className="absolute inset-0 backdrop-blur-[2px] bg-background/60 rounded-lg z-10 flex flex-col items-center justify-center gap-2">
                        <div className="text-3xl opacity-20">???</div>
                        <p className="text-xs font-display text-muted-foreground/50 tracking-[0.3em]">CLASSIFIÉ</p>
                      </div>
                      {/* Ghost content behind blur */}
                      <div className="opacity-20">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl">🌍</span>
                          <div>
                            <h3 className="font-display font-bold text-foreground tracking-wider text-lg">██████████</h3>
                            <p className="text-xs text-muted-foreground">★★★★</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">████████████ █████ ██████████████ ████ ██████.</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
