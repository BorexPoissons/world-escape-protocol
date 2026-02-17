import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Lock, CheckCircle, Puzzle as PuzzleIcon } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import WorldPathMap from "@/components/WorldPathMap";

const TOTAL_PIECES_PER_COUNTRY = 5;

const flagEmoji: Record<string, string> = {
  CH: "🇨🇭",
  JP: "🇯🇵",
  EG: "🇪🇬",
};

interface CountryPuzzleData {
  country: Tables<"countries">;
  unlockedPieces: number;
  totalPieces: number;
}

const Puzzle = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [puzzleData, setPuzzleData] = useState<CountryPuzzleData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [countriesRes, piecesRes] = await Promise.all([
        supabase.from("countries").select("*").order("difficulty_base"),
        supabase.from("puzzle_pieces").select("*").eq("user_id", user.id).eq("unlocked", true),
      ]);

      const countries = countriesRes.data || [];
      const pieces = piecesRes.data || [];

      const data: CountryPuzzleData[] = countries.map((country) => ({
        country,
        unlockedPieces: pieces.filter((p) => p.country_id === country.id).length,
        totalPieces: TOTAL_PIECES_PER_COUNTRY,
      }));

      setPuzzleData(data);
      setLoading(false);
    };

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
  const totalPieces = puzzleData.reduce((sum, d) => sum + d.totalPieces, 0);
  const globalProgress = totalPieces > 0 ? Math.round((totalUnlocked / totalPieces) * 100) : 0;

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-display text-lg font-bold text-primary tracking-wider">W.E.P.</h1>
          </div>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground font-display tracking-wider">
              <ArrowLeft className="h-4 w-4 mr-2" />
              RETOUR
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Title & Global Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <PuzzleIcon className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-display font-bold text-foreground tracking-widest">
              PUZZLE MONDIAL
            </h1>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            Chaque mission réussie débloque une pièce du puzzle. Complétez tous les pays pour révéler le secret final.
          </p>

          {/* Global progress bar */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm font-display mb-2">
              <span className="text-muted-foreground tracking-wider">PROGRESSION GLOBALE</span>
              <span className="text-primary">{globalProgress}%</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden border border-border">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${globalProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-display tracking-wider">
              {totalUnlocked} / {totalPieces} PIÈCES DÉBLOQUÉES
            </p>
          </div>
        </motion.div>

        {/* Animated World Path */}
        <WorldPathMap
          countries={puzzleData.map((d) => ({
            id: d.country.id,
            name: d.country.name,
            code: d.country.code,
            unlocked: d.unlockedPieces > 0,
          }))}
        />

        {/* World Map Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {puzzleData.map((data, i) => (
            <motion.div
              key={data.country.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * i }}
            >
              <PuzzleCard data={data} />
            </motion.div>
          ))}
        </div>

        {puzzleData.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-display tracking-wider">
              AUCUN PAYS DISPONIBLE
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

const PuzzleCard = ({ data }: { data: CountryPuzzleData }) => {
  const { country, unlockedPieces, totalPieces } = data;
  const isComplete = unlockedPieces >= totalPieces;
  const progress = totalPieces > 0 ? (unlockedPieces / totalPieces) * 100 : 0;

  return (
    <div
      className={`relative bg-card border rounded-lg overflow-hidden transition-all duration-300 ${
        isComplete ? "border-primary/50 border-glow" : "border-border"
      }`}
    >
      {/* Header */}
      <div className="p-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{flagEmoji[country.code] || "🏳️"}</span>
          <div>
            <h3 className="font-display font-bold text-foreground tracking-wider">
              {country.name.toUpperCase()}
            </h3>
            <p className="text-xs text-muted-foreground font-display">
              {unlockedPieces}/{totalPieces} PIÈCES
            </p>
          </div>
        </div>
        {isComplete ? (
          <CheckCircle className="h-6 w-6 text-primary" />
        ) : (
          <Lock className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Puzzle Grid */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: totalPieces }).map((_, idx) => {
            const unlocked = idx < unlockedPieces;
            return (
              <motion.div
                key={idx}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05 * idx + 0.2 }}
                className={`aspect-square rounded-sm flex items-center justify-center transition-all duration-300 ${
                  unlocked
                    ? "bg-primary/20 border border-primary/40"
                    : "bg-secondary border border-border"
                }`}
              >
                <PuzzleIcon
                  className={`h-4 w-4 ${
                    unlocked ? "text-primary" : "text-muted-foreground/30"
                  }`}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-5">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          />
        </div>
      </div>

      {/* Link */}
      <Link to={`/mission/${country.id}`}>
        <div className="border-t border-border px-5 py-3 flex items-center justify-center gap-2 text-sm font-display tracking-wider text-muted-foreground hover:text-primary transition-colors cursor-pointer">
          {isComplete ? "REVOIR LA MISSION" : "LANCER LA MISSION"}
        </div>
      </Link>
    </div>
  );
};

export default Puzzle;
