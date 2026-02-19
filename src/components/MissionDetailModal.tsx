import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Shield, Eye, CheckCircle, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { WEPPuzzlePiece } from "@/components/WEPPuzzlePiece";

interface MissionRecord {
  id: string;
  mission_title: string;
  score: number | null;
  completed_at: string | null;
  mission_data: any;
}

interface FragmentReward {
  id: string;
  name: string;
  concept: string;
  unlocked_message: string;
}

interface CountryJSON {
  fragment_reward?: FragmentReward;
}

interface MissionDetailModalProps {
  country: Tables<"countries">;
  unlockedPieces: number;
  totalPieces: number;
  missions: MissionRecord[];
  hasFragment?: boolean;
  onClose: () => void;
}


const FLAG_EMOJIS: Record<string, string> = {
  CH: "🇨🇭", JP: "🇯🇵", EG: "🇪🇬", FR: "🇫🇷", US: "🇺🇸",
  DE: "🇩🇪", IT: "🇮🇹", ES: "🇪🇸", GB: "🇬🇧", BR: "🇧🇷",
  CN: "🇨🇳", IN: "🇮🇳", RU: "🇷🇺", MA: "🇲🇦", GR: "🇬🇷",
};

const MissionDetailModal = ({
  country,
  unlockedPieces,
  missions,
  hasFragment,
  onClose,
}: MissionDetailModalProps) => {
  const collected = hasFragment ?? unlockedPieces > 0;
  const latestMission = missions[missions.length - 1] ?? null;
  const flag = FLAG_EMOJIS[country.code] || "🏳️";

  const [countryJSON, setCountryJSON] = useState<CountryJSON | null>(null);

  useEffect(() => {
    fetch(`/content/countries/${country.code}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setCountryJSON(data))
      .catch(() => null);
  }, [country.code]);

  const fragmentReward = countryJSON?.fragment_reward;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-lg bg-card border border-primary/30 rounded-xl overflow-hidden shadow-2xl"
          style={{ boxShadow: "0 0 40px hsl(40 80% 55% / 0.15)" }}
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-5 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-5">
              {/* WEP Unique Piece */}
              <WEPPuzzlePiece
                countryCode={country.code}
                size={80}
                animated={collected}
                mode="inventory"
                showKeyword={false}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-3xl">{flag}</span>
                  <h2 className="font-display font-bold text-xl text-primary tracking-wider truncate">
                    {country.name.toUpperCase()}
                  </h2>
                </div>

                {/* Binary fragment status */}
                {collected ? (
                  <motion.div
                    className="flex items-center gap-2 mt-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: "hsl(40 80% 55%)" }} />
                    <span className="text-sm font-display tracking-widest font-bold" style={{ color: "hsl(40 80% 55%)" }}>
                      FRAGMENT COLLECTÉ
                    </span>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-display tracking-widest text-muted-foreground">
                      FRAGMENT NON OBTENU
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4 max-h-[420px] overflow-y-auto">

            {/* Fragment narrative (from JSON) */}
            {collected && fragmentReward && (
              <motion.div
                className="rounded-lg p-4 border"
                style={{
                  background: "hsl(40 80% 55% / 0.06)",
                  borderColor: "hsl(40 80% 55% / 0.25)",
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-xs font-display tracking-widest text-muted-foreground mb-3">DONNÉES DU FRAGMENT</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground font-display tracking-wider">NOM</p>
                    <p className="text-sm font-display font-bold" style={{ color: "hsl(40 80% 65%)" }}>
                      {fragmentReward.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-display tracking-wider">CONCEPT</p>
                    <p className="text-xs font-display font-bold tracking-widest" style={{ color: "hsl(40 60% 50%)" }}>
                      {fragmentReward.concept}
                    </p>
                  </div>
                  <div className="pt-2 border-t" style={{ borderColor: "hsl(40 80% 55% / 0.2)" }}>
                    <p className="text-xs text-muted-foreground font-display tracking-wider mb-1">INDICE NARRATIF</p>
                    <p className="text-sm italic leading-relaxed" style={{ color: "hsl(40 85% 70%)" }}>
                      « {fragmentReward.unlocked_message} »
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Country description */}
            {country.description && (
              <div>
                <p className="text-xs font-display text-muted-foreground tracking-wider mb-1">CONTEXTE</p>
                <p className="text-sm text-foreground leading-relaxed">{country.description}</p>
              </div>
            )}

            {/* Latest mission */}
            {latestMission ? (
              <div className="bg-secondary/40 rounded-lg p-4 border border-border">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs font-display text-muted-foreground tracking-wider mb-1">DERNIÈRE MISSION</p>
                    <p className="text-sm font-display font-bold text-foreground">
                      {latestMission.mission_title}
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                </div>

                {latestMission.score !== null && latestMission.mission_data?.enigmes && (
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="text-sm font-display text-primary">
                      {latestMission.score}/{latestMission.mission_data.enigmes.length} énigmes résolues
                    </span>
                  </div>
                )}

                {latestMission.mission_data?.moral_choice && (
                  <div className="flex items-start gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-display tracking-wider mb-0.5">DILEMME MORAL</p>
                      <p className="text-xs text-foreground opacity-80">
                        {latestMission.mission_data.moral_choice.description?.slice(0, 120)}...
                      </p>
                    </div>
                  </div>
                )}

                {latestMission.mission_data?.final_fragment && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground font-display tracking-wider mb-1">FRAGMENT NARRATIF</p>
                    <p className="text-xs text-primary italic leading-relaxed">
                      "{latestMission.mission_data.final_fragment.slice(0, 150)}..."
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-secondary/20 rounded-lg p-4 border border-dashed border-border text-center">
                <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-display tracking-wider">
                  AUCUNE MISSION COMPLÉTÉE
                </p>
              </div>
            )}

            {missions.length > 1 && (
              <p className="text-xs text-muted-foreground text-center">
                {missions.length} mission{missions.length > 1 ? "s" : ""} effectuée{missions.length > 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Footer CTA */}
          <div className="px-6 pb-6 pt-2">
            <Link to={`/mission/${country.id}`} onClick={onClose}>
              <Button className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90">
                {collected ? "REJOUER LA MISSION" : "LANCER LA MISSION"}
              </Button>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MissionDetailModal;
