import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Image, Zap, Lock } from "lucide-react";

interface HintImage {
  url: string;
  caption: string;
}

interface HintShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentXP: number;
  hasHintImage: boolean;
  hintImage?: HintImage;
  questionType?: "A" | "B" | "C";
  explanation?: string;
  narrativeUnlock?: string;
  onBuyTextHint: () => void;
  onBuyPhotoHint: () => void;
  textHintAlreadyUsed: boolean;
  photoHintAlreadyUsed: boolean;
}

function getTextHint(
  questionType?: "A" | "B" | "C",
  explanation?: string,
  narrativeUnlock?: string
): string {
  if (explanation) return explanation;
  if (questionType === "C" && narrativeUnlock) return narrativeUnlock;
  if (questionType === "A") return "Cette information est vérifiable directement dans les données géographiques ou économiques du pays.";
  if (questionType === "B") return "Réfléchissez à l'impact systémique de chaque réponse sur l'équilibre mondial.";
  return "Analysez les éléments narratifs pour identifier la réponse correcte.";
}

export default function HintShopModal({
  isOpen,
  onClose,
  currentXP,
  hasHintImage,
  hintImage,
  questionType,
  explanation,
  narrativeUnlock,
  onBuyTextHint,
  onBuyPhotoHint,
  textHintAlreadyUsed,
  photoHintAlreadyUsed,
}: HintShopModalProps) {
  const [revealedText, setRevealedText] = useState(false);
  const [revealedPhoto, setRevealedPhoto] = useState(false);

  const TEXT_COST = 50;
  const PHOTO_COST = 100;

  const canAffordText = currentXP >= TEXT_COST;
  const canAffordPhoto = currentXP >= PHOTO_COST;

  const hintText = getTextHint(questionType, explanation, narrativeUnlock);

  const handleBuyText = () => {
    if (!canAffordText || textHintAlreadyUsed) return;
    setRevealedText(true);
    onBuyTextHint();
  };

  const handleBuyPhoto = () => {
    if (!canAffordPhoto || !hasHintImage || photoHintAlreadyUsed) return;
    setRevealedPhoto(true);
    onBuyPhotoHint();
  };

  const handleClose = () => {
    setRevealedText(false);
    setRevealedPhoto(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="hint-shop-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="hint-shop-modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md mx-4"
          >
            <div
              className="bg-card rounded-lg overflow-hidden shadow-2xl"
              style={{
                border: "1px solid hsl(var(--gold-glow) / 0.4)",
                boxShadow: "0 0 40px hsl(var(--gold-glow) / 0.12), 0 20px 60px rgba(0,0,0,0.7)",
              }}
            >
              {/* Header */}
              <div
                className="relative flex items-center justify-between px-5 py-3.5"
                style={{
                  borderBottom: "1px solid hsl(var(--gold-glow) / 0.25)",
                  background: "hsl(var(--gold-glow) / 0.05)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Zap className="h-4 w-4" style={{ color: "hsl(var(--gold-glow))" }} />
                  <div>
                    <p
                      className="text-xs font-display tracking-[0.3em] font-bold"
                      style={{ color: "hsl(var(--gold-glow))" }}
                    >
                      BOUTIQUE D'ARCHIVES — W.E.P.
                    </p>
                    <p className="text-[10px] text-muted-foreground font-display tracking-wider mt-0.5">
                      SOLDE : <span style={{ color: "hsl(var(--gold-glow))" }}>{currentXP} XP</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">

                {/* Text hint */}
                <div
                  className="rounded-lg p-4 space-y-3"
                  style={{
                    background: textHintAlreadyUsed || revealedText
                      ? "hsl(var(--primary) / 0.04)"
                      : "hsl(var(--card))",
                    border: `1px solid ${
                      textHintAlreadyUsed || revealedText
                        ? "hsl(var(--primary) / 0.3)"
                        : canAffordText
                        ? "hsl(var(--border) / 0.6)"
                        : "hsl(var(--border) / 0.3)"
                    }`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: textHintAlreadyUsed || revealedText ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
                      />
                      <div>
                        <p
                          className="text-xs font-display tracking-wider font-semibold"
                          style={{ color: textHintAlreadyUsed || revealedText ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}
                        >
                          INDICE TEXTE
                        </p>
                        <p className="text-[10px] text-muted-foreground">Révèle un élément narratif clé</p>
                      </div>
                    </div>
                    {textHintAlreadyUsed || revealedText ? (
                      <span className="text-[10px] font-display tracking-wider px-2 py-1 rounded" style={{ color: "hsl(var(--primary))", background: "hsl(var(--primary) / 0.1)" }}>
                        RÉVÉLÉ
                      </span>
                    ) : (
                      <button
                        onClick={handleBuyText}
                        disabled={!canAffordText}
                        className="text-[11px] font-display tracking-wider px-3 py-1.5 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                        style={{
                          background: canAffordText ? "hsl(var(--primary) / 0.15)" : "transparent",
                          border: "1px solid hsl(var(--primary) / 0.5)",
                          color: "hsl(var(--primary))",
                        }}
                        onMouseEnter={e => canAffordText && ((e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--primary) / 0.25)")}
                        onMouseLeave={e => canAffordText && ((e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--primary) / 0.15)")}
                      >
                        {!canAffordText && <Lock className="h-3 w-3" />}
                        {TEXT_COST} XP
                      </button>
                    )}
                  </div>

                  {/* Revealed text content */}
                  <AnimatePresence>
                    {(revealedText || textHintAlreadyUsed) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-md p-3"
                        style={{
                          background: "hsl(var(--primary) / 0.06)",
                          border: "1px solid hsl(var(--primary) / 0.2)",
                        }}
                      >
                        <p className="text-[10px] font-display tracking-[0.25em] mb-1.5" style={{ color: "hsl(var(--primary) / 0.7)" }}>
                          TRANSMISSION · JASPER VALCOURT
                        </p>
                        <p className="text-sm text-foreground leading-relaxed italic">"{hintText}"</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!canAffordText && !textHintAlreadyUsed && !revealedText && (
                    <p className="text-[10px] text-muted-foreground/60 font-display tracking-wider">
                      XP insuffisants — Il vous faut {TEXT_COST - currentXP} XP de plus
                    </p>
                  )}
                </div>

                {/* Photo hint */}
                <div
                  className="rounded-lg p-4 space-y-3"
                  style={{
                    background: photoHintAlreadyUsed || revealedPhoto
                      ? "hsl(var(--gold-glow) / 0.04)"
                      : "hsl(var(--card))",
                    border: `1px solid ${
                      photoHintAlreadyUsed || revealedPhoto
                        ? "hsl(var(--gold-glow) / 0.4)"
                        : hasHintImage && canAffordPhoto
                        ? "hsl(var(--border) / 0.6)"
                        : "hsl(var(--border) / 0.3)"
                    }`,
                    opacity: hasHintImage ? 1 : 0.5,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Image
                        className="h-4 w-4 flex-shrink-0"
                        style={{
                          color: photoHintAlreadyUsed || revealedPhoto
                            ? "hsl(var(--gold-glow))"
                            : hasHintImage
                            ? "hsl(var(--muted-foreground))"
                            : "hsl(var(--border))"
                        }}
                      />
                      <div>
                        <p
                          className="text-xs font-display tracking-wider font-semibold"
                          style={{
                            color: photoHintAlreadyUsed || revealedPhoto
                              ? "hsl(var(--gold-glow))"
                              : hasHintImage
                              ? "hsl(var(--foreground))"
                              : "hsl(var(--muted-foreground) / 0.5)"
                          }}
                        >
                          ARCHIVE PHOTO
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {hasHintImage ? "Document d'archive disponible" : "Non disponible pour cette énigme"}
                        </p>
                      </div>
                    </div>

                    {photoHintAlreadyUsed || revealedPhoto ? (
                      <span className="text-[10px] font-display tracking-wider px-2 py-1 rounded" style={{ color: "hsl(var(--gold-glow))", background: "hsl(var(--gold-glow) / 0.1)" }}>
                        RÉVÉLÉ
                      </span>
                    ) : hasHintImage ? (
                      <button
                        onClick={handleBuyPhoto}
                        disabled={!canAffordPhoto}
                        className="text-[11px] font-display tracking-wider px-3 py-1.5 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                        style={{
                          background: canAffordPhoto ? "hsl(var(--gold-glow) / 0.12)" : "transparent",
                          border: "1px solid hsl(var(--gold-glow) / 0.5)",
                          color: "hsl(var(--gold-glow))",
                        }}
                        onMouseEnter={e => canAffordPhoto && ((e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--gold-glow) / 0.22)")}
                        onMouseLeave={e => canAffordPhoto && ((e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--gold-glow) / 0.12)")}
                      >
                        {!canAffordPhoto && <Lock className="h-3 w-3" />}
                        {PHOTO_COST} XP
                      </button>
                    ) : (
                      <span className="text-[10px] font-display tracking-wider text-muted-foreground/40">INDISPONIBLE</span>
                    )}
                  </div>

                  {/* Revealed photo */}
                  <AnimatePresence>
                    {(revealedPhoto || photoHintAlreadyUsed) && hintImage && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4 }}
                        className="rounded-md overflow-hidden"
                        style={{ border: "1px solid hsl(var(--gold-glow) / 0.3)" }}
                      >
                        <img
                          src={hintImage.url}
                          alt={hintImage.caption}
                          className="w-full object-cover max-h-48"
                        />
                        <p
                          className="px-3 py-2 text-[10px] font-display tracking-wider italic"
                          style={{ color: "hsl(var(--gold-glow) / 0.8)", background: "hsl(var(--card))" }}
                        >
                          {hintImage.caption}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 rounded font-display tracking-widest text-xs transition-all"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border) / 0.5)",
                    color: "hsl(var(--muted-foreground))",
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--gold-glow) / 0.4)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--border) / 0.5)")}
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
