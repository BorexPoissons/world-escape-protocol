import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, SkipForward } from "lucide-react";
import jasperImg from "@/assets/jasper-velcourt.png";

interface IntroScreenProps {
  onComplete: () => void;
}

const SLIDE_DURATIONS = [7000, 8000, 8000, 7000, 6000];

function TypeLines({ lines, delay = 0 }: { lines: { text: string; style?: string }[]; delay?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {lines.map((line, i) => (
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: delay + i * 0.55 }}
          className={line.style ?? "text-xl md:text-2xl font-body text-foreground/80 leading-relaxed"}
        >
          {line.text}
        </motion.p>
      ))}
    </div>
  );
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [showFinal, setShowFinal] = useState(false);
  const TOTAL_SLIDES = 5;

  const skip = useCallback(() => onComplete(), [onComplete]);

  const advance = useCallback(() => {
    if (slideIndex < TOTAL_SLIDES - 1) {
      setSlideIndex((i) => i + 1);
    } else {
      setShowFinal(true);
    }
  }, [slideIndex]);

  useEffect(() => {
    if (showFinal) return;
    const timer = setTimeout(advance, SLIDE_DURATIONS[slideIndex]);
    return () => clearTimeout(timer);
  }, [slideIndex, showFinal, advance]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background">
      {/* PASSER */}
      {!showFinal && (
        <button
          onClick={skip}
          className="absolute top-5 right-5 z-50 flex items-center gap-1.5 text-xs tracking-widest font-display px-3 py-1.5 rounded border border-border text-muted-foreground bg-background/50 transition-opacity hover:opacity-100 opacity-60"
        >
          <SkipForward className="h-3 w-3" />
          PASSER
        </button>
      )}

      {/* Progress dots */}
      {!showFinal && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-40">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <div
              key={i}
              className={`h-0.5 rounded-full transition-all duration-700 ${
                i <= slideIndex ? "bg-primary" : "bg-muted-foreground/30"
              }`}
              style={{ width: i === slideIndex ? "2rem" : "0.4rem" }}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {!showFinal ? (
          <motion.div
            key={`slide-${slideIndex}`}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            {/* ═══ SLIDE 1 — 48 pays, un réseau invisible ═══ */}
            {slideIndex === 0 && (
              <div className="h-full flex flex-col items-center justify-center px-8 bg-background">
                <div className="absolute inset-0 bg-grid opacity-[0.06] pointer-events-none" />
                <div className="max-w-2xl text-center space-y-6">
                  <TypeLines
                    lines={[
                      { text: "🌍 48 pays. Un réseau invisible.", style: "text-2xl md:text-4xl font-display font-bold text-foreground text-center leading-tight" },
                    ]}
                    delay={0.4}
                  />
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.6, duration: 1 }}
                    className="space-y-3 text-center"
                  >
                    <p className="text-base md:text-lg font-body text-foreground/60 leading-relaxed">
                      Des crises surgissent comme des dominos parfaitement alignés.
                    </p>
                    <p className="text-sm md:text-base font-display tracking-widest text-primary/90">
                      4 saisons.&nbsp;&nbsp;12 pays chacune.&nbsp;&nbsp;Une vérité enfouie.
                    </p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 3.2, duration: 0.9 }}
                    className="pt-2"
                  >
                    <p className="text-foreground/50 text-sm font-body mb-2">Un nom revient dans les archives confidentielles :</p>
                    <p className="text-3xl md:text-5xl font-display font-bold tracking-widest text-primary">
                      LE CERCLE.
                    </p>
                  </motion.div>
                </div>
              </div>
            )}

            {/* ═══ SLIDE 2 — Le Cercle ═══ */}
            {slideIndex === 1 && (
              <div className="h-full flex flex-col items-center justify-center px-8 bg-background">
                <div className="absolute inset-0 bg-grid opacity-[0.07] pointer-events-none" />
                <div className="max-w-2xl text-center space-y-5">
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="text-sm font-display tracking-[0.3em] uppercase text-muted-foreground"
                  >
                    Archives — Niveau Oméga
                  </motion.p>
                  <TypeLines
                    lines={[
                      { text: "Personne ne sait s'il s'agit d'une organisation…", style: "text-xl md:text-2xl font-body text-foreground/70 leading-relaxed italic" },
                      { text: "…ou d'un système enraciné dans 48 pays.", style: "text-xl md:text-2xl font-body text-foreground/70 leading-relaxed italic" },
                    ]}
                    delay={0.8}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.8, duration: 0.8 }}
                    className="mt-4 border border-primary/25 bg-primary/5 rounded-lg p-4"
                  >
                    <p className="text-foreground/50 text-xs font-display tracking-widest mb-1">DOSSIER CONFIDENTIEL #0071-C</p>
                    <p className="text-base md:text-lg font-body text-foreground/80">
                      "Le Cercle ne fait pas de bruit. Il déplace des pions sur 4 continents."
                    </p>
                  </motion.div>
                </div>
              </div>
            )}

            {/* ═══ SLIDE 3 — Jasper Valcourt ═══ */}
            {slideIndex === 2 && (
              <div className="h-full flex items-center justify-center px-4 bg-background">
                <div className="max-w-4xl w-full flex flex-col md:flex-row items-center gap-8 md:gap-12">
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="flex-shrink-0"
                  >
                    <div className="w-52 md:w-64 rounded-xl overflow-hidden shadow-lg">
                      <img src={jasperImg} alt="J. Valcourt" className="w-full h-full object-cover" />
                    </div>
                  </motion.div>

                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }}>
                      <p className="text-xs font-display tracking-[0.3em] mb-1 text-muted-foreground">
                        BERNE — 05H42
                      </p>
                      <h2 className="text-3xl md:text-5xl font-display font-bold text-primary">
                        Jasper Valcourt
                      </h2>
                    </motion.div>
                    <TypeLines
                      lines={[
                        { text: "J'ai parcouru 48 pays en trois ans.", style: "text-base md:text-lg font-body text-foreground/80 italic" },
                        { text: "Partout, les mêmes incohérences.", style: "text-base md:text-lg font-body text-foreground/70 italic" },
                        { text: "Ce n'est pas du hasard. C'est un système.", style: "text-base md:text-lg font-body font-semibold text-foreground/90 italic" },
                      ]}
                      delay={1.1}
                    />
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 3.4, duration: 0.9 }}
                      className="text-sm md:text-base font-body text-foreground/50 italic"
                    >
                      — Jasper Valcourt, enquêteur indépendant
                    </motion.p>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ SLIDE 4 — La Suisse, point de départ ═══ */}
            {slideIndex === 3 && (
              <div className="h-full flex flex-col items-center justify-center px-8 bg-background">
                <div className="absolute inset-0 bg-grid opacity-[0.07] pointer-events-none" />
                <div className="max-w-2xl w-full space-y-5">
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm font-display tracking-[0.3em] text-center text-muted-foreground"
                  >
                    🇨🇭 POINT DE DÉPART — SUISSE
                  </motion.p>
                  <TypeLines
                    lines={[
                      { text: "Berne. Le coffre-fort de l'Europe.", style: "text-xl md:text-2xl font-body text-foreground/80 text-center leading-relaxed italic" },
                      { text: "Un pays qui ne dirige rien…", style: "text-xl md:text-2xl font-body text-foreground/60 text-center" },
                      { text: "…mais par lequel tout transite.", style: "text-xl md:text-2xl font-display font-bold text-center text-primary" },
                    ]}
                    delay={0.6}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.6, duration: 0.8 }}
                    className="mt-2 border border-primary/25 bg-primary/5 rounded-lg p-4"
                  >
                    <p className="text-base md:text-lg font-body text-foreground/80 text-center leading-relaxed">
                      "4 saisons. 48 pays. 4 clés à assembler.
                      <br />
                      <span className="text-primary">Et chaque pays laisse des traces."</span>
                    </p>
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 4.2 }}
                    className="text-center font-display tracking-widest pt-2 text-xs text-muted-foreground"
                  >
                    La Saison I commence ici.
                  </motion.p>
                </div>
              </div>
            )}

            {/* ═══ SLIDE 5 — Avertissement ═══ */}
            {slideIndex === 4 && (
              <div className="h-full flex flex-col items-center justify-center px-8 bg-background">
                <div className="absolute inset-0 bg-grid opacity-[0.06] pointer-events-none" />
                <div className="max-w-xl text-center space-y-6">
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
                    <p className="text-4xl mb-3">⚠️</p>
                    <p className="text-xl md:text-3xl font-display font-bold text-foreground">Le Cercle ne regarde pas sans agir.</p>
                  </motion.div>
                  <TypeLines
                    lines={[
                      { text: "120 secondes par pays. 3 vies. Pas de seconde chance.", style: "text-base md:text-lg font-body text-foreground/60 text-center" },
                      { text: "Chaque fragment vous rapproche de la clé.", style: "text-base md:text-lg font-body text-foreground/60 text-center" },
                      { text: "48 pays. 4 clés. Une vérité.", style: "text-base md:text-lg font-body text-foreground/80 text-center font-medium" },
                    ]}
                    delay={1.2}
                  />
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* ═══════════ ÉCRAN FINAL ═══════════ */
          <motion.div
            key="final"
            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
          >
            <div className="absolute inset-0 scanline pointer-events-none" />
            <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-7 max-w-lg">
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                <span className="classified-stamp text-xs">CLASSIFIÉ — NIVEAU OMEGA</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="w-24 rounded-xl overflow-hidden shadow-lg"
              >
                <img src={jasperImg} alt="J. Valcourt" className="w-full object-cover" />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8 }}>
                <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground tracking-tight leading-tight">
                  WORLD ESCAPE
                  <br />
                  <span className="font-display font-bold text-primary">
                    PROTOCOL
                  </span>
                </h1>
                <p className="mt-2 text-sm font-display tracking-[0.3em] text-muted-foreground">
                  48 PAYS · 4 SAISONS · 4 CLÉS
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3, duration: 0.7 }}
                className="flex flex-col sm:flex-row gap-4 w-full"
              >
                <button
                  onClick={onComplete}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-display tracking-widest text-sm transition-all border-glow bg-primary text-primary-foreground"
                >
                  <ChevronRight className="h-4 w-4" />
                  COMMENCER L'ENQUÊTE
                </button>
                <button
                  onClick={skip}
                  className="flex items-center justify-center gap-2 px-5 py-4 rounded-lg font-display tracking-widest text-sm transition-all border border-border text-muted-foreground"
                >
                  <SkipForward className="h-4 w-4" />
                  PASSER
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
