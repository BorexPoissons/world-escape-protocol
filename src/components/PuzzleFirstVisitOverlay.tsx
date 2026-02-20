import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import jasperSignalImg from "@/assets/jasper-signal.png";
import TypewriterText from "@/components/TypewriterText";
import { useState } from "react";

interface PuzzleFirstVisitOverlayProps {
  onDismiss: () => void;
}

export default function PuzzleFirstVisitOverlay({ onDismiss }: PuzzleFirstVisitOverlayProps) {
  const [textDone, setTextDone] = useState(false);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/85 backdrop-blur-md" />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        style={{ boxShadow: "0 0 80px hsl(40 80% 55% / 0.12)" }}
      >
        {/* Top badge */}
        <div className="flex justify-center pt-5">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-display tracking-[0.2em]"
            style={{
              borderColor: "hsl(40 80% 55% / 0.4)",
              background: "hsl(40 80% 55% / 0.08)",
              color: "hsl(40 85% 65%)",
            }}
          >
            <Radio className="h-3 w-3" />
            TRANSMISSION INITIALE
          </div>
        </div>

        {/* Portrait */}
        <div className="flex justify-center mt-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <div
              className="w-20 h-20 rounded-full overflow-hidden border-2"
              style={{
                borderColor: "hsl(40 80% 55% / 0.6)",
                boxShadow: "0 0 25px hsl(40 80% 55% / 0.35)",
              }}
            >
              <img
                src={jasperSignalImg}
                alt="Jasper Valcourt"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>

        {/* Name */}
        <p
          className="text-center mt-3 text-xs font-display tracking-[0.2em]"
          style={{ color: "hsl(40 80% 55%)" }}
        >
          JASPER VALCOURT
        </p>

        {/* Typewriter message */}
        <div className="px-6 sm:px-8 mt-4 min-h-[80px]">
          <TypewriterText
            text="Agent... Voici l'étendue du Protocole. 195 pays. 195 fragments. L'aventure commence maintenant."
            speed={28}
            onDone={() => setTextDone(true)}
            className="text-sm leading-relaxed font-body text-foreground/85 italic"
          />
        </div>

        {/* CTA */}
        <div className="px-6 sm:px-8 pb-6 pt-4">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: textDone ? 1 : 0.3 }}
            onClick={onDismiss}
            disabled={!textDone}
            className="w-full rounded-lg bg-primary px-5 py-3 font-display text-sm tracking-[0.15em] text-primary-foreground hover:bg-primary/90 transition-colors disabled:cursor-not-allowed"
          >
            COMMENCER L'ENQUÊTE
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
