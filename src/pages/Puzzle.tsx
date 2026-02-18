import { useEffect, useState, useRef } from "react";
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
  Home,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import WorldPathMap from "@/components/WorldPathMap";
import PuzzlePieceSVG from "@/components/PuzzlePieceSVG";
import MissionDetailModal from "@/components/MissionDetailModal";

const TOTAL_PIECES_PER_COUNTRY = 5;
const TOTAL_COUNTRIES_IN_WORLD = 195;

const FLAG_EMOJI: Record<string, string> = {
  CH: "🇨🇭",
  JP: "🇯🇵",
  EG: "🇪🇬",
};

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
  isNew?: boolean;
}

const INSPIRING_MESSAGES = [
  "Chaque pièce vous rapproche de la vérité.",
  "Assemblez le puzzle mondial pour révéler le secret.",
  "Les agents les plus persévérants déchiffrent l'histoire.",
  "Le monde est un puzzle — à vous de le résoudre.",
  "Chaque mission dévoile une part du mystère global.",
];

const Puzzle = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [puzzleData, setPuzzleData] = useState<CountryPuzzleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<CountryPuzzleData | null>(null);
  const [inspireIdx, setInspireIdx] = useState(0);
  const prevPiecesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    // Auth check disabled for demo — re-enable in production
    // if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Rotate inspiring messages
  useEffect(() => {
    const interval = setInterval(() => {
      setInspireIdx((i) => (i + 1) % INSPIRING_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Real-time subscription for new puzzle pieces
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("puzzle-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "puzzle_pieces",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchData = async (checkNew = false) => {
    if (!user) return;

    const [countriesRes, piecesRes, missionsRes] = await Promise.all([
      supabase.from("countries").select("*").order("difficulty_base"),
      supabase
        .from("puzzle_pieces")
        .select("*")
        .eq("user_id", user.id)
        .eq("unlocked", true),
      supabase
        .from("missions")
        .select("id, mission_title, score, completed_at, mission_data, country_id")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("completed_at"),
    ]);

    const countries = countriesRes.data || [];
    const pieces = piecesRes.data || [];
    const missions = missionsRes.data || [];

    const data: CountryPuzzleData[] = countries.map((country) => {
      const countryPieces = pieces.filter((p) => p.country_id === country.id).length;
      const prevCount = prevPiecesRef.current[country.id] ?? countryPieces;
      const isNew = checkNew && countryPieces > prevCount;

      return {
        country,
        unlockedPieces: countryPieces,
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
        isNew,
      };
    });

    // Update ref
    const newRef: Record<string, number> = {};
    data.forEach((d) => (newRef[d.country.id] = d.unlockedPieces));
    prevPiecesRef.current = newRef;

    setPuzzleData(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary font-display animate-pulse-gold text-xl tracking-widest">
          ASSEMBLAGE DU PUZZLE...
        </div>
      </div>
    );
  }

  const totalUnlocked = puzzleData.reduce((sum, d) => sum + d.unlockedPieces, 0);
  // Progress on 195 countries (current countries contribute their piece ratio)
  const globalProgressOn195 = Math.round((totalUnlocked / (TOTAL_COUNTRIES_IN_WORLD * TOTAL_PIECES_PER_COUNTRY)) * 100 * 10) / 10;
  const totalPiecesUnlocked = totalUnlocked;

  // Next country to unlock
  const nextCountry = puzzleData.find((d) => d.unlockedPieces === 0);
  const continueCountry = puzzleData.find((d) => d.unlockedPieces > 0 && d.unlockedPieces < d.totalPieces) || nextCountry;

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
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
          <Link to="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground font-display tracking-wider"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              RETOUR
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <Globe className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-display font-bold text-foreground tracking-widest">
              PUZZLE MONDIAL
            </h1>
          </div>

          {/* Rotating inspiring message */}
          <AnimatePresence mode="wait">
            <motion.p
              key={inspireIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
              className="text-muted-foreground text-sm font-display tracking-wider italic max-w-md mx-auto"
            >
              "{INSPIRING_MESSAGES[inspireIdx]}"
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Global Progress — 195 countries */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-w-2xl mx-auto bg-card border border-border rounded-xl p-6"
          style={{ boxShadow: "0 0 20px hsl(40 80% 55% / 0.06)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-display tracking-widest text-muted-foreground mb-0.5">
                PROGRESSION MONDIALE
              </p>
              <p className="text-2xl font-display font-bold text-primary">
                {globalProgressOn195}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-display tracking-widest text-muted-foreground mb-0.5">
                PIÈCES OBTENUES
              </p>
              <p className="text-xl font-display font-bold text-foreground">
                {totalPiecesUnlocked}
                <span className="text-muted-foreground text-sm font-normal">
                  /{TOTAL_COUNTRIES_IN_WORLD * TOTAL_PIECES_PER_COUNTRY}
                </span>
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-secondary rounded-full overflow-hidden border border-border">
            <motion.div
              className="h-full rounded-full relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(90deg, hsl(40 80% 55%), hsl(40 60% 40%))",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(globalProgressOn195, 100)}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              {/* Shimmer */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, hsl(40 90% 80% / 0.4) 50%, transparent 100%)",
                }}
                animate={{ x: ["-100%", "200%"] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              />
            </motion.div>
          </div>

          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground font-display tracking-wider">
            <span>PAYS ACTIFS: {puzzleData.length}/{TOTAL_COUNTRIES_IN_WORLD}</span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              {puzzleData.filter((d) => d.unlockedPieces > 0).length} PAYS DÉBLOQUÉS
            </span>
          </div>
        </motion.div>

        {/* World path map */}
        <WorldPathMap
          countries={puzzleData.map((d) => ({
            id: d.country.id,
            name: d.country.name,
            code: d.country.code,
            unlocked: d.unlockedPieces > 0,
          }))}
        />

        {/* Countries grid */}
        <div className="space-y-8">
          <h2 className="font-display text-lg text-muted-foreground tracking-widest text-center">
            — PAYS DISPONIBLES —
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {puzzleData.map((data, i) => (
              <motion.div
                key={data.country.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <CountryPuzzleCard
                  data={data}
                  onSelect={() => setSelectedCountry(data)}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA — Continue Adventure */}
        {continueCountry && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center pb-8"
          >
            <div className="inline-block bg-card border border-primary/30 rounded-xl px-8 py-6"
              style={{ boxShadow: "0 0 30px hsl(40 80% 55% / 0.1)" }}
            >
              <Compass className="h-10 w-10 text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-display tracking-wider mb-4">
                VOTRE PROCHAINE DESTINATION
              </p>
              <p className="text-lg font-display font-bold text-foreground mb-4">
                {FLAG_EMOJI[continueCountry.country.code] || "🌍"}{" "}
                {continueCountry.country.name.toUpperCase()}
              </p>
              <Link to={`/mission/${continueCountry.country.id}`}>
                <Button className="font-display tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-5 text-base gap-2">
                  CONTINUER L'AVENTURE
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </main>

      {/* Mission detail modal */}
      {selectedCountry && (
        <MissionDetailModal
          country={selectedCountry.country}
          unlockedPieces={selectedCountry.unlockedPieces}
          totalPieces={selectedCountry.totalPieces}
          missions={selectedCountry.missions}
          onClose={() => setSelectedCountry(null)}
        />
      )}
    </div>
  );
};

// ─── Country Puzzle Card ───────────────────────────────────────────────
interface CountryPuzzleCardProps {
  data: CountryPuzzleData;
  onSelect: () => void;
}

const CountryPuzzleCard = ({ data, onSelect }: CountryPuzzleCardProps) => {
  const { country, unlockedPieces, totalPieces, isNew } = data;
  const isComplete = unlockedPieces >= totalPieces;
  const hasAny = unlockedPieces > 0;

  return (
    <motion.div
      className={`relative bg-card border rounded-xl overflow-hidden transition-all duration-300 cursor-pointer group ${
        isComplete
          ? "border-primary/50"
          : hasAny
          ? "border-primary/25"
          : "border-border"
      }`}
      style={
        isComplete
          ? { boxShadow: "0 0 20px hsl(40 80% 55% / 0.15)" }
          : undefined
      }
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* New badge */}
      {isNew && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground text-xs font-display tracking-wider px-2 py-0.5 rounded-full"
        >
          NOUVEAU !
        </motion.div>
      )}

      {/* Header */}
      <div className="p-5 pb-3 flex items-center gap-3">
        <motion.span
          className="text-3xl"
          animate={isNew ? { scale: [1, 1.3, 1] } : {}}
          transition={{ repeat: 2, duration: 0.4 }}
        >
          {FLAG_EMOJI[country.code] || "🏳️"}
        </motion.span>
        <div className="flex-1">
          <h3 className="font-display font-bold text-foreground tracking-wider group-hover:text-primary transition-colors">
            {country.name.toUpperCase()}
          </h3>
          <p className="text-xs text-muted-foreground font-display">
            {unlockedPieces}/{totalPieces} PIÈCES
          </p>
        </div>
        {isComplete && (
          <span className="text-xs font-display text-primary tracking-wider bg-primary/10 px-2 py-0.5 rounded">
            COMPLET
          </span>
        )}
      </div>

      {/* Puzzle Pieces SVG Grid */}
      <div className="px-4 pb-2">
        <div className="flex flex-wrap gap-0.5 justify-center">
          {Array.from({ length: totalPieces }).map((_, idx) => (
            <PuzzlePieceSVG
              key={idx}
              index={idx}
              total={totalPieces}
              unlocked={idx < unlockedPieces}
              isNew={isNew && idx === unlockedPieces - 1}
            />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-3">
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedPieces / totalPieces) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          />
        </div>
      </div>

      {/* Footer link */}
      <div className="border-t border-border px-5 py-3 flex items-center justify-center gap-2 text-sm font-display tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
        {isComplete ? "VOIR LES DÉTAILS" : hasAny ? "CONTINUER" : "DÉCOUVRIR"}
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </motion.div>
  );
};

export default Puzzle;
