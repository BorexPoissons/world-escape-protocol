import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ArrowLeft,
  Compass,
  Sparkles,
  Globe,
  ChevronRight,
  CheckCircle2,
  X,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import CinematicWorldMap, { COUNTRY_GEO } from "@/components/CinematicWorldMap";
import type { MapCountry } from "@/components/CinematicWorldMap";
import FragmentInventory from "@/components/FragmentInventory";
import type { Fragment } from "@/components/FragmentInventory";
import MissionDetailModal from "@/components/MissionDetailModal";
import UpgradeModal from "@/components/UpgradeModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MissionRecord {
  id: string;
  mission_title: string;
  score: number | null;
  completed_at: string | null;
  mission_data: any;
}

interface CountryPuzzleData {
  country: Tables<"countries">;
  unlockedPieces: number;
  totalPieces: number;
  missions: MissionRecord[];
}

type Tier = "free" | "agent" | "director";
type CountryVisibility = "playable" | "locked_s1" | "locked_s2" | "locked_s3" | "locked_s4" | "locked_upgrade" | "silhouette" | "hidden";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_PIECES_PER_COUNTRY = 5;
const TOTAL_COUNTRIES_IN_WORLD = 195;

const INSPIRING_MESSAGES = [
  "Chaque pièce vous rapproche de la vérité.",
  "Assemblez le puzzle mondial pour révéler le secret.",
  "Les agents les plus persévérants déchiffrent l'histoire.",
  "Le monde est un puzzle — à vous de le résoudre.",
  "Chaque mission dévoile une part du mystère global.",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTier(subscriptionType: string): Tier {
  if (subscriptionType === "director") return "director";
  if (subscriptionType === "agent") return "agent";
  return "free";
}

function getCountryVisibility(country: Tables<"countries">, tier: Tier): CountryVisibility {
  const season = country.season_number ?? 1;
  const isSecret = country.is_secret ?? false;

  // Director sees everything
  if (tier === "director") return isSecret ? "playable" : "playable";

  // Secret countries only for director
  if (isSecret) return "hidden";

  // Agent: Season 0 + Season 1 playable, rest shown locked
  if (tier === "agent") {
    if (season === 0) return "playable";
    if (season === 1) return "playable";
    if (season === 2) return "locked_s2";
    if (season === 3) return "locked_s3";
    return "locked_s4";
  }

  // Free: only Season 0 playable, all others shown locked by season
  if (season === 0) return "playable";
  if (season === 1) return "locked_s1";
  if (season === 2) return "locked_s2";
  if (season === 3) return "locked_s3";
  return "locked_s4";
}

// ─── Snap notification ───────────────────────────────────────────────────────

interface SnapNotif {
  id: string;
  countryName: string;
  success: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const Puzzle = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [puzzleData, setPuzzleData] = useState<CountryPuzzleData[]>([]);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<CountryPuzzleData | null>(null);
  const [inspireIdx, setInspireIdx] = useState(0);
  const [tier, setTier] = useState<Tier>("free");
  const [draggingFragmentId, setDraggingFragmentId] = useState<string | null>(null);
  const [placedCountryIds, setPlacedCountryIds] = useState<string[]>([]);
  const [snapNotifs, setSnapNotifs] = useState<SnapNotif[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Rotate inspiring messages
  useEffect(() => {
    const interval = setInterval(() => {
      setInspireIdx((i) => (i + 1) % INSPIRING_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("puzzle-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "puzzle_pieces", filter: `user_id=eq.${user.id}` }, () => fetchData())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_fragments", filter: `user_id=eq.${user.id}` }, () => fetchFragments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchFragments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_fragments" as any)
      .select("*, countries(code, name)")
      .eq("user_id", user.id);

    if (data) {
      const frags: Fragment[] = (data as any[]).map((f) => ({
        id: f.id,
        countryId: f.country_id,
        countryCode: f.countries?.code ?? "??",
        countryName: f.countries?.name ?? "Inconnu",
        fragmentIndex: f.fragment_index,
        isPlaced: f.is_placed,
      }));
      setFragments(frags);
      setPlacedCountryIds(frags.filter(f => f.isPlaced).map(f => f.countryId));
    }
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) {
      // Demo mode — load countries only
      const { data: countriesData } = await supabase.from("countries").select("*").order("release_order");
      if (countriesData) {
        setPuzzleData(countriesData.map(c => ({
          country: c,
          unlockedPieces: 0,
          totalPieces: TOTAL_PIECES_PER_COUNTRY,
          missions: [],
        })));
      }
      setLoading(false);
      return;
    }

    const [countriesRes, fragmentsRes, missionsRes, profileRes] = await Promise.all([
      supabase.from("countries").select("*").order("release_order"),
      supabase.from("user_fragments" as any).select("id, country_id, fragment_index, is_placed").eq("user_id", user.id),
      supabase.from("missions").select("id, mission_title, score, completed_at, mission_data, country_id").eq("user_id", user.id).eq("completed", true).order("completed_at"),
      supabase.from("profiles").select("subscription_type").eq("user_id", user.id).single(),
    ]);

    const countries = countriesRes.data || [];
    const fragments = (fragmentsRes.data as any[]) || [];
    const missions = missionsRes.data || [];

    // Set tier
    const subType = (profileRes.data as any)?.subscription_type ?? "free";
    setTier(getTier(subType));

    const data: CountryPuzzleData[] = countries.map((country) => {
      // 1 fragment per country max (has fragment or not)
      const hasFragment = fragments.some((f: any) => f.country_id === country.id);
      return {
        country,
        unlockedPieces: hasFragment ? 1 : 0,
        totalPieces: TOTAL_PIECES_PER_COUNTRY,
        missions: missions
          .filter((m) => m.country_id === country.id)
          .map((m) => ({
            id: m.id,
            mission_title: m.mission_title,
            score: m.score,
            completed_at: m.completed_at,
            mission_data: m.mission_data,
          })),
      };
    });

    setPuzzleData(data);
    setLoading(false);
    await fetchFragments();
  }, [user, fetchFragments]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Fragment drag & drop ─────────────────────────────────────────────────

  const handleDropOnCountry = async (countryId: string) => {
    if (!draggingFragmentId || !user) return;

    const fragment = fragments.find(f => f.id === draggingFragmentId);
    if (!fragment) return;

    const isCorrect = fragment.countryId === countryId;

    if (isCorrect) {
      // Update DB
      await supabase
        .from("user_fragments" as any)
        .update({ is_placed: true, placed_at: new Date().toISOString() })
        .eq("id", draggingFragmentId);

      setFragments(prev => prev.map(f => f.id === draggingFragmentId ? { ...f, isPlaced: true } : f));
      setPlacedCountryIds(prev => [...prev, countryId]);

      // Snap notification
      const notifId = crypto.randomUUID();
      setSnapNotifs(prev => [...prev, { id: notifId, countryName: fragment.countryName, success: true }]);
      setTimeout(() => setSnapNotifs(prev => prev.filter(n => n.id !== notifId)), 3000);
    } else {
      // Wrong country — error notification
      const notifId = crypto.randomUUID();
      setSnapNotifs(prev => [...prev, { id: notifId, countryName: fragment.countryName, success: false }]);
      setTimeout(() => setSnapNotifs(prev => prev.filter(n => n.id !== notifId)), 2500);
    }

    setDraggingFragmentId(null);
  };

  // ─── Derived data ─────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-primary font-display animate-pulse text-sm tracking-widest">
            ASSEMBLAGE DU PUZZLE MONDIAL...
          </p>
        </div>
      </div>
    );
  }

  // Count countries with at least 1 fragment (1 per country max)
  const countriesWithFragment = puzzleData.filter(d => d.unlockedPieces > 0).length;
  const globalProgressOn195 = Math.round((countriesWithFragment / TOTAL_COUNTRIES_IN_WORLD) * 100 * 10) / 10;

  // Build map countries — show ALL non-hidden countries (including locked ones) for full world view
  const mapCountries: MapCountry[] = puzzleData
    .filter(d => getCountryVisibility(d.country, tier) !== "hidden")
    .map(d => {
      const dbX = d.country.puzzle_position_x;
      const dbY = d.country.puzzle_position_y;
      const geo = (dbX != null && dbY != null)
        ? { x: dbX as number, y: dbY as number }
        : COUNTRY_GEO[d.country.code] ?? { x: 50, y: 50 };
      return {
        id: d.country.id,
        name: d.country.name,
        code: d.country.code,
        unlockedPieces: d.unlockedPieces,
        totalPieces: d.totalPieces,
        visibility: getCountryVisibility(d.country, tier),
        x: geo.x,
        y: geo.y,
        seasonNumber: d.country.season_number,
      };
    });

  // Next country = respects SIGNAL INITIAL sequence (CH→US→CN→BR→EG), then other playable
  const SIGNAL_INITIAL_SEQUENCE = ["CH", "US", "CN", "BR", "EG"];

  // Find the first country in sequence that has no fragment yet
  const nextSequenceCode = SIGNAL_INITIAL_SEQUENCE.find(code => {
    const entry = puzzleData.find(d => d.country.code === code);
    return entry && getCountryVisibility(entry.country, tier) === "playable" && entry.unlockedPieces === 0;
  });

  const continueCountry = nextSequenceCode
    ? puzzleData.find(d => d.country.code === nextSequenceCode)
    : puzzleData.find(d => {
        const vis = getCountryVisibility(d.country, tier);
        return vis === "playable" && d.unlockedPieces === 0;
      });

  // All free countries completed and still on free tier → show upgrade CTA
  const allFreeCompleted =
    tier === "free" &&
    !continueCountry &&
    puzzleData.some(d => d.unlockedPieces > 0);

  const handleCountryClick = (mapCountry: MapCountry) => {
    const data = puzzleData.find(d => d.country.id === mapCountry.id);
    if (data) setSelectedCountry(data);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Snap notifications */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {snapNotifs.map(notif => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 60, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.8 }}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-display tracking-wider shadow-lg ${
                notif.success
                  ? "bg-card border-primary/50 text-primary"
                  : "bg-card border-destructive/50 text-destructive"
              }`}
            >
              {notif.success ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  FRAGMENT INTÉGRÉ — {notif.countryName.toUpperCase()}
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  FRAGMENT REJETÉ — MAUVAIS PAYS
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Globe className="h-4 w-4" />
              <span className="text-xs font-display tracking-wider hidden sm:inline">ACCUEIL</span>
            </Link>
            <span className="text-border">|</span>
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-display text-lg font-bold text-primary tracking-wider">W.E.P.</h1>
          </div>

          {/* Global stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs font-display tracking-widest text-muted-foreground">🧩 PLAN RÉVÉLÉ</p>
              <p className="text-sm font-display font-bold text-primary">{globalProgressOn195}%</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-right">
              <p className="text-xs font-display tracking-widest text-muted-foreground">PAYS ACTIFS</p>
              <p className="text-sm font-display font-bold text-foreground">
                {countriesWithFragment}/{TOTAL_COUNTRIES_IN_WORLD}
              </p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-right">
              <p className="text-xs font-display tracking-widest text-muted-foreground">STATUT</p>
              <p
                className="text-sm font-display font-bold"
                style={{
                  color:
                    globalProgressOn195 >= 100 ? "hsl(0 70% 58%)" :
                    globalProgressOn195 >= 50  ? "hsl(280 65% 62%)" :
                    globalProgressOn195 >= 20  ? "hsl(160 60% 52%)" :
                    globalProgressOn195 >= 5   ? "hsl(220 80% 65%)" :
                    "hsl(40 85% 62%)",
                }}
              >
                {globalProgressOn195 >= 100 ? "MAÎTRE DU PROTOCOLE" :
                 globalProgressOn195 >= 50  ? "ARCHITECTE" :
                 globalProgressOn195 >= 20  ? "STRATÈGE" :
                 globalProgressOn195 >= 5   ? "AGENT" : "EXPLORATEUR"}
              </p>
            </div>
          </div>

          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground font-display tracking-wider">
              <ArrowLeft className="h-4 w-4 mr-2" />
              RETOUR
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Globe className="h-7 w-7 text-primary" />
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-widest">
              PUZZLE MONDIAL
            </h1>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={inspireIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
              className="text-muted-foreground text-sm font-display tracking-wider italic"
            >
              "{INSPIRING_MESSAGES[inspireIdx]}"
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center justify-between mb-1.5 text-xs font-display text-muted-foreground tracking-wider">
            <span>PROGRESSION MONDIALE — {TOTAL_COUNTRIES_IN_WORLD} PAYS</span>
            <span>{globalProgressOn195}% — {countriesWithFragment}/{TOTAL_COUNTRIES_IN_WORLD} ACTIFS</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden border border-border">
            <motion.div
              className="h-full rounded-full relative overflow-hidden"
              style={{ background: "linear-gradient(90deg, hsl(40 80% 55%), hsl(40 60% 40%))" }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(globalProgressOn195, 100)}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              <motion.div
                className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, transparent 0%, hsl(40 90% 80% / 0.4) 50%, transparent 100%)" }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* ═══ CINEMATIC WORLD MAP ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CinematicWorldMap
            countries={mapCountries}
            draggingFragmentId={draggingFragmentId}
            placedCountryIds={placedCountryIds}
            onDropOnCountry={handleDropOnCountry}
            onCountryClick={handleCountryClick}
            globalProgress={globalProgressOn195}
            collectedCountryCodes={fragments.map(f => f.countryCode)}
          />
        </motion.div>

        {/* ═══ FRAGMENT INVENTORY ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <FragmentInventory
            fragments={fragments}
            draggingId={draggingFragmentId}
            onDragStart={(id) => setDraggingFragmentId(id)}
            onDragEnd={() => setDraggingFragmentId(null)}
          />
        </motion.div>

        {/* ═══ CONTINUE ADVENTURE CTA ═══ */}
        {(continueCountry || allFreeCompleted) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center pb-8"
          >
            {continueCountry ? (
              /* Next mission available */
              <div
                className="inline-block bg-card border border-primary/30 rounded-xl px-8 py-6"
                style={{ boxShadow: "0 0 40px hsl(40 80% 55% / 0.08)" }}
              >
                <Compass className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="text-xs text-muted-foreground font-display tracking-widest mb-2">
                  PROCHAINE DESTINATION
                </p>
                <p className="text-lg font-display font-bold text-foreground mb-1">
                  {continueCountry.country.name.toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground font-display mb-4 tracking-wider">
                  OPÉRATION {continueCountry.country.operation_name || continueCountry.country.operation_number}
                </p>
                <Link to={`/mission/${continueCountry.country.id}`}>
                  <Button className="font-display tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-6">
                    CONTINUER L'AVENTURE
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              /* All free missions done — upgrade CTA */
              <div
                className="inline-block bg-card border rounded-xl px-8 py-7 max-w-sm w-full"
                style={{
                  borderColor: "hsl(40 80% 55% / 0.4)",
                  boxShadow: "0 0 60px hsl(40 80% 55% / 0.12)",
                }}
              >
                <motion.div
                  className="w-12 h-12 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center mx-auto mb-4"
                  animate={{ boxShadow: ["0 0 10px hsl(40 80% 55% / 0.3)", "0 0 25px hsl(40 80% 55% / 0.6)", "0 0 10px hsl(40 80% 55% / 0.3)"] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                >
                  <Shield className="h-6 w-6 text-primary" />
                </motion.div>

                <p className="text-xs font-display tracking-[0.3em] text-primary mb-2">
                  SIGNAL INITIAL — TERMINÉ
                </p>
                <h3 className="text-lg font-display font-bold text-foreground tracking-wider mb-2">
                  ESSAI GRATUIT COMPLÉTÉ
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 font-body">
                  Vous avez collecté tous les fragments de l'opération initiale. La suite de l'enquête — 190 pays, 
                  des révélations classifiées et le Protocole Oméga — requiert une autorisation de niveau supérieur.
                </p>

                <div
                  className="rounded-lg px-4 py-3 mb-5 text-center"
                  style={{ background: "hsl(40 80% 55% / 0.08)", border: "1px solid hsl(40 80% 55% / 0.2)" }}
                >
                  <p className="text-xs text-muted-foreground font-display tracking-wider mb-0.5">PAIEMENT UNIQUE · ACCÈS À VIE</p>
                  <p className="text-3xl font-display font-bold text-primary">
                    19.90 <span className="text-base text-muted-foreground">CHF</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sans abonnement · Sans frais cachés</p>
                </div>

                <Button
                  className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 gap-2 mb-3"
                  onClick={() => setShowUpgrade(true)}
                >
                  <Shield className="h-4 w-4" />
                  ACCÉDER AU MODULE AGENT
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>

                <p className="text-xs text-muted-foreground font-display tracking-wider text-center">
                  50 PAYS · MISSIONS NARRATIVES ÉTENDUES · BADGES EXCLUSIFS
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-5 pb-4 text-xs font-display tracking-wider text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "hsl(40 85% 62%)" }} />
            <span style={{ color: "hsl(40 85% 62%)" }}>GRATUIT (5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "hsl(220 80% 65%)" }} />
            <span style={{ color: "hsl(220 80% 65%)" }}>SAISON 1 (43)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "hsl(160 60% 52%)" }} />
            <span style={{ color: "hsl(160 60% 52%)" }}>SAISON 2 (72)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "hsl(280 65% 62%)" }} />
            <span style={{ color: "hsl(280 65% 62%)" }}>SAISON 3 (40)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "hsl(0 70% 58%)" }} />
            <span style={{ color: "hsl(0 70% 58%)" }}>SAISON 4 (35)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full opacity-50" style={{ background: "hsl(280 60% 30%)" }} />
            <span>OMÉGA — DIRECTEUR</span>
          </div>
        </div>
      </main>

      {/* Mission detail modal */}
      {selectedCountry && (
        <MissionDetailModal
          country={selectedCountry.country}
          unlockedPieces={selectedCountry.unlockedPieces}
          totalPieces={selectedCountry.totalPieces}
          missions={selectedCountry.missions}
          hasFragment={selectedCountry.unlockedPieces > 0}
          onClose={() => setSelectedCountry(null)}
        />
      )}

      {/* Upgrade modal */}
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        type="agent"
      />
    </div>
  );
};

export default Puzzle;
