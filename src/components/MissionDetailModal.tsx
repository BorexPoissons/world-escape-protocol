import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Shield, Eye, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

interface MissionRecord {
  id: string;
  mission_title: string;
  score: number | null;
  completed_at: string | null;
  mission_data: any;
}

interface MissionDetailModalProps {
  country: Tables<"countries">;
  unlockedPieces: number;
  totalPieces: number;
  missions: MissionRecord[];
  onClose: () => void;
}

const MissionDetailModal = ({
  country,
  unlockedPieces,
  totalPieces,
  missions,
  onClose,
}: MissionDetailModalProps) => {
  const latestMission = missions[missions.length - 1] ?? null;
  const progress = totalPieces > 0 ? Math.round((unlockedPieces / totalPieces) * 100) : 0;

  const flagEmoji: Record<string, string> = { CH: "🇨🇭", JP: "🇯🇵", EG: "🇪🇬" };
  const flag = flagEmoji[country.code] || "🏳️";

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
          {/* Header gradient */}
          <div className="relative px-6 pt-6 pb-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-4">
              <span className="text-5xl">{flag}</span>
              <div>
                <h2 className="font-display font-bold text-xl text-primary tracking-wider">
                  {country.name.toUpperCase()}
                </h2>
                <p className="text-xs text-muted-foreground font-display tracking-widest mt-0.5">
                  PIÈCES: {unlockedPieces}/{totalPieces}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5 max-h-96 overflow-y-auto">
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

                {/* Score */}
                {latestMission.score !== null && latestMission.mission_data?.enigmes && (
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="text-sm font-display text-primary">
                      {latestMission.score}/{latestMission.mission_data.enigmes.length} énigmes résolues
                    </span>
                  </div>
                )}

                {/* Moral choice made */}
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

                {/* Final fragment */}
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

            {/* All missions count */}
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
                {unlockedPieces >= totalPieces ? "REJOUER LA MISSION" : "LANCER LA MISSION"}
              </Button>
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MissionDetailModal;
