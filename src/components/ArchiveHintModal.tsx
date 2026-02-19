import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Lock } from "lucide-react";

interface HintImage {
  url: string;
  caption: string;
}

interface ArchiveHintModalProps {
  isOpen: boolean;
  onClose: () => void;
  hintImage?: HintImage;
  countryName?: string;
}

export default function ArchiveHintModal({ isOpen, onClose, hintImage, countryName }: ArchiveHintModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="archive-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="archive-modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-lg mx-4"
          >
            <div
              className="bg-card rounded-lg overflow-hidden shadow-2xl"
              style={{
                border: "1px solid hsl(var(--gold-glow) / 0.4)",
                boxShadow: "0 0 40px hsl(var(--gold-glow) / 0.1), 0 20px 60px rgba(0,0,0,0.7)",
              }}
            >
              {/* Scan lines overlay */}
              <div
                className="absolute inset-0 pointer-events-none z-10 rounded-lg"
                style={{
                  backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
                }}
              />

              {/* Header */}
              <div
                className="relative flex items-center justify-between px-5 py-3"
                style={{
                  borderBottom: "1px solid hsl(var(--gold-glow) / 0.3)",
                  background: "hsl(var(--gold-glow) / 0.06)",
                }}
              >
                {/* Animated border pulse */}
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-t-lg pointer-events-none"
                  style={{ border: "1px solid hsl(var(--gold-glow) / 0.2)" }}
                />

                <div className="flex items-center gap-2.5">
                  <Lock className="h-3.5 w-3.5" style={{ color: "hsl(var(--gold-glow))" }} />
                  <div>
                    <p
                      className="text-xs font-display tracking-[0.3em] font-bold"
                      style={{ color: "hsl(var(--gold-glow))" }}
                    >
                      DOSSIER D'ARCHIVE — CLASSIFIÉ W.E.P.
                    </p>
                    {countryName && (
                      <p className="text-[10px] text-muted-foreground font-display tracking-wider mt-0.5">
                        TRANSMISSION SÉCURISÉE · {countryName.toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Image / Fallback */}
              <div className="relative">
                {hintImage?.url ? (
                  <div className="relative overflow-hidden" style={{ maxHeight: "280px" }}>
                    <img
                      src={hintImage.url}
                      alt={hintImage.caption}
                      className="w-full object-cover"
                      style={{ maxHeight: "280px" }}
                      onError={(e) => {
                        // Fallback: hide image on load error
                        (e.target as HTMLImageElement).style.display = "none";
                        const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                    {/* Hidden fallback */}
                    <div
                      className="hidden items-center justify-center flex-col gap-3 py-12"
                      style={{ background: "hsl(var(--muted) / 0.3)" }}
                    >
                      <FileText className="h-12 w-12 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground font-display tracking-wider">ARCHIVE INDISPONIBLE</p>
                    </div>

                    {/* Gradient overlay on image */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "linear-gradient(to top, hsl(var(--card)) 0%, transparent 40%)",
                      }}
                    />

                    {/* Caption */}
                    <div className="absolute bottom-0 left-0 right-0 px-5 pb-3">
                      <p
                        className="text-xs font-display tracking-wider italic"
                        style={{ color: "hsl(var(--gold-glow) / 0.8)" }}
                      >
                        {hintImage.caption}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* No image fallback */
                  <div
                    className="flex flex-col items-center justify-center gap-4 py-12"
                    style={{ background: "hsl(var(--muted) / 0.15)" }}
                  >
                    <motion.div
                      animate={{ opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    >
                      <FileText className="h-14 w-14 text-muted-foreground/30" />
                    </motion.div>
                    <p className="text-xs text-muted-foreground font-display tracking-widest">
                      AUCUNE ARCHIVE DISPONIBLE
                    </p>
                  </div>
                )}
              </div>

              {/* Narrative text */}
              <div className="px-5 py-4 space-y-3">
                <div
                  className="rounded-md p-4"
                  style={{
                    background: "hsl(var(--primary) / 0.05)",
                    border: "1px solid hsl(var(--primary) / 0.15)",
                  }}
                >
                  <p
                    className="text-[10px] font-display tracking-[0.3em] mb-2"
                    style={{ color: "hsl(var(--primary))" }}
                  >
                    TRANSMISSION CRYPTÉE · JASPER VALCOURT
                  </p>
                  <p className="text-sm text-foreground leading-relaxed italic">
                    "L'image parle. Laissez-la vous guider. La réponse est devant vous."
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded font-display tracking-widest text-sm transition-all"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--gold-glow) / 0.4)",
                    color: "hsl(var(--gold-glow))",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--gold-glow) / 0.1)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--card))";
                  }}
                >
                  FERMER — CONTINUER LA MISSION
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
