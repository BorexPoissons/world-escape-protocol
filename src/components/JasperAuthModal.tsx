import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Radio } from "lucide-react";
import jasperPortrait from "@/assets/jasper-auth-portrait.png";

const STORAGE_KEY = "wep_jasper_auth_modal_next_show_at";

function canShowNow(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const next = Number(raw);
    if (Number.isNaN(next)) return true;
    return Date.now() >= next;
  } catch {
    return true;
  }
}

function snooze24h() {
  try {
    const next = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // localStorage blocked
  }
}

interface JasperAuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function JasperAuthModal({ open, onClose }: JasperAuthModalProps) {
  const handleDismiss = () => {
    snooze24h();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl border-glow"
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute right-3 top-3 z-10 rounded-sm p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
              {/* Portrait side */}
              <div className="relative bg-secondary/40 p-4 md:p-5">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground font-display tracking-wider">
                  <Radio className="h-3 w-3 text-primary" />
                  Transmission sécurisée
                </div>

                <div className="overflow-hidden rounded-lg border border-border bg-background/30">
                  <img
                    src={jasperPortrait}
                    alt="Jasper Valcourt"
                    className="h-48 w-full object-cover object-top md:h-64"
                    loading="lazy"
                  />
                </div>

                <div className="mt-3 space-y-0.5 text-xs text-muted-foreground font-display tracking-wider">
                  <div>
                    Identité : <span className="text-foreground/80">J. Valcourt</span>
                  </div>
                  <div>
                    Statut : <span className="text-foreground/80">Actif / Introuvable</span>
                  </div>
                </div>
              </div>

              {/* Content side */}
              <div className="p-5 md:p-6">
                <div className="mb-2 text-xs font-display tracking-wider text-primary/80">
                  Niveau de suspicion : <span className="text-primary">faible</span>
                </div>

                <h2 className="text-lg font-display font-bold tracking-wider text-primary text-glow">
                  TRANSMISSION — JASPER VALCOURT
                </h2>

                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/80 font-body">
                  {"Agent… si vous êtes ici, c'est que vous avez été repéré.\n\nAvant d'entrer, une règle : ne laissez aucune trace.\nCréez votre dossier. Puis rejoignez-moi. Le Protocole a commencé.\n\n— J. Valcourt"}
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleDismiss}
                    className="rounded-md bg-primary px-5 py-2.5 font-display text-sm tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    RECEVOIR LA TRANSMISSION
                  </button>

                  <button
                    onClick={handleDismiss}
                    className="rounded-md border border-border bg-secondary/50 px-5 py-2.5 font-display text-sm tracking-wider text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    PLUS TARD
                  </button>
                </div>

                <div className="mt-4 text-xs text-muted-foreground/60">
                  Conseil : activez un pseudo. Évitez d'utiliser votre email principal.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Hook: auto-open after ~750ms, once per 24h */
export function useJasperAuthModalAutoOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!canShowNow()) return;
    const t = window.setTimeout(() => setOpen(true), 750);
    return () => window.clearTimeout(t);
  }, []);

  return { open, setOpen, close: () => setOpen(false) };
}
