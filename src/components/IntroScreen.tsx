import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, SkipForward } from "lucide-react";
import jasperImg from "@/assets/jasper-velcourt.png";

interface IntroScreenProps {
  onComplete: () => void;
}

// Durées en ms par slide
const SLIDE_DURATIONS = [7000, 8000, 8000, 7000, 6000];

// Ligne animée ligne par ligne
function TypeLines({ lines, delay = 0 }: { lines: { text: string; style?: string }[]; delay?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {lines.map((line, i) => (
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: delay + i * 0.55 }}
          className={line.style ?? "text-xl md:text-2xl font-body text-white/80 leading-relaxed"}
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      {/* PASSER — toujours visible */}
      {!showFinal && (
        <button
          onClick={skip}
          className="absolute top-5 right-5 z-50 flex items-center gap-1.5 text-xs tracking-widest font-display px-3 py-1.5 rounded border transition-opacity hover:opacity-100 opacity-60"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))", background: "rgba(0,0,0,0.5)" }}
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
              className="h-0.5 rounded-full transition-all duration-700"
              style={{
                width: i === slideIndex ? "2rem" : "0.4rem",
                backgroundColor: i <= slideIndex ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
              }}
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
            {/* ═══ SLIDE 1 — Le monde n'est pas ce qu'il paraît ═══ */}
            {slideIndex === 0 && (
              <div className="h-full flex flex-col items-center justify-center px-8 bg-black">
                <div className="absolute inset-0 bg-grid opacity-[0.06] pointer-events-none" />
                <div className="max-w-2xl text-center space-y-6">
                  <TypeLines
                    lines={[
                      { text: "🌍 Le monde n'est pas ce qu'il paraît.", style: "text-2xl md:text-4xl font-display font-bold text-white text-center leading-tight" },
                    ]}
                    delay={0.4}
                  />
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.6, duration: 1 }}
                    className="space-y-3 text-center"
                  >
                    <p className="text-base md:text-lg font-body text-white/60 leading-relaxed">
                      Depuis des décennies, des décisions majeures semblent prises dans l'ombre.
                    </p>
                    <p className="text-sm md:text-base font-display tracking-widest" style={{ color: "hsl(var(--primary) / 0.9)" }}>
                      Crises financières.&nbsp;&nbsp;Pénuries énergétiques.&nbsp;&nbsp;Accords technologiques.
                    </p>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 3.2, duration: 0.9 }}
                    className="pt-2"
                  >
                    <p className="text-white/50 text-sm font-body mb-2">Un nom revient dans les archives confidentielles :</p>
                    <p
                      className="text-3xl md:text-5xl font-display font-bold tracking-widest"
                      style={{ color: "hsl(var(--primary))", textShadow: "0 0 40px hsl(var(--gold-glow) / 0.5)" }}
                    >
                      LE CERCLE.
                    </p>
                  </motion.div>
                </div>
              </div>
            )}

            {/* ═══ SLIDE 2 — Le Cercle ═══ */}
            {slideIndex === 1 && (
              <div className="h-full flex flex-col items-center justify-center px-8 bg-gradient-to-b from-black via-zinc-950 to-black">
                <div className="absolute inset-0 bg-grid opacity-[0.07] pointer-events-none" />
                <div className="max-w-2xl text-center space-y-5">
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="text-sm font-display tracking-[0.3em] uppercase"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    Archives — Niveau Oméga
                  </motion.p>
                  <TypeLines
                    lines={[
                      { text: "Personne ne sait s'il s'agit d'une organisation…", style: "text-xl md:text-2xl font-body text-white/70 leading-relaxed italic" },
                      { text: "…ou d'un réseau invisible présent dans chaque pays.", style: "text-xl md:text-2xl font-body text-white/70 leading-relaxed italic" },
                    ]}
                    delay={0.8}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.8, duration: 0.8 }}
                    className="mt-4 border rounded-lg p-4"
                    style={{ borderColor: "hsl(var(--primary) / 0.25)", background: "hsl(var(--primary) / 0.05)" }}
                  >
                    <p className="text-white/50 text-xs font-display tracking-widest mb-1">DOSSIER CONFIDENTIEL #0071-C</p>
                    <p className="text-base md:text-lg font-body text-white/80">
                      "Le Cercle ne fait pas de bruit. Il déplace des pions."
                    </p>
                  </motion.div>
                </div>
              </div>
            )}

            {/* ═══ SLIDE 3 — Jasper Velcourt ═══ */}
            {slideIndex === 2 && (
              <div className="h-full flex items-center justify-center px-4 bg-gradient-to-br from-zinc-950 via-stone-950 to-black">
                <div className="max-w-4xl w-full flex flex-col md:flex-row items-center gap-8 md:gap-12">
                  {/* Portrait */}
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="flex-shrink-0"
                  >
                    <div
                      className="w-52 md:w-64 rounded-xl overflow-hidden"
                      style={{ boxShadow: "0 0 40px hsl(var(--gold-glow) / 0.25), 0 0 80px hsl(var(--gold-glow) / 0.1)" }}
                    >
                      <img src={jasperImg} alt="J. Velcourt" className="w-full h-full object-cover" />
                    </div>
                  </motion.div>

                  {/* Text */}
                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }}>
                      <p className="text-xs font-display tracking-[0.3em] mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                        AGENT INDÉPENDANT
                      </p>
                      <h2
                        className="text-3xl md:text-5xl font-display font-bold"
                        style={{ color: "hsl(var(--primary))", textShadow: "0 0 30px hsl(var(--gold-glow) / 0.4)" }}
                      >
                        Jasper Velcourt
                      </h2>
                    </motion.div>
                    <TypeLines
                      lines={[
                        { text: "Détective international indépendant.", style: "text-base md:text-lg font-body text-white/80" },
                        { text: "Spécialiste des systèmes cachés et des fausses pistes.", style: "text-base md:text-lg font-body text-white/70" },
                        { text: "Il ne traque pas des criminels.", style: "text-base md:text-lg font-body text-white/60 italic" },
                        { text: "Il traque des structures invisibles.", style: "text-base md:text-lg font-body text-white/60 italic" },
                      ]}
                      delay={1.2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ SLIDE 4 — La Mission ═══ */}
            {slideIndex === 3 && (
              <div className="h-full flex flex-col items-center justify-center px-8 bg-gradient-to-b from-black via-slate-950 to-black">
                <div className="absolute inset-0 bg-grid opacity-[0.07] pointer-events-none" />
                <div className="max-w-2xl w-full space-y-5">
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm font-display tracking-[0.3em] text-center"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    🕵️ JASPER NE PEUT PAS AGIR SEUL
                  </motion.p>
                  <TypeLines
                    lines={[
                      { text: "Chaque pays cache un fragment d'une carte cryptée mondiale.", style: "text-xl md:text-2xl font-body text-white/80 text-center leading-relaxed" },
                    ]}
                    delay={0.6}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.8, duration: 0.8 }}
                    className="grid grid-cols-3 gap-3 mt-2"
                  >
                    {[
                      { icon: "🔍", label: "Une enquête" },
                      { icon: "🧩", label: "Trois énigmes" },
                      { icon: "🗺️", label: "Un fragment" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="text-center py-4 px-2 rounded-lg border"
                        style={{ borderColor: "hsl(var(--primary) / 0.2)", background: "hsl(var(--primary) / 0.05)" }}
                      >
                        <div className="text-2xl mb-1">{item.icon}</div>
                        <p className="text-xs font-display tracking-wider text-white/60">{item.label}</p>
                      </div>
                    ))}
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 3.2 }}
                    className="text-center font-display tracking-widest pt-2"
                    style={{ color: "hsl(var(--primary))" }}
                  >
                    195 pays.&nbsp;&nbsp;195 fragments.
                  </motion.p>
                </div>
              </div>
            )}

            {/* ═══ SLIDE 5 — Avertissement ═══ */}
            {slideIndex === 4 && (
              <div className="h-full flex flex-col items-center justify-center px-8 bg-black">
                <div className="absolute inset-0 bg-grid opacity-[0.06] pointer-events-none" />
                <div className="max-w-xl text-center space-y-6">
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.8 }}>
                    <p className="text-4xl mb-3">⚠️</p>
                    <p className="text-xl md:text-3xl font-display font-bold text-white">Le Cercle ne regarde pas sans agir.</p>
                  </motion.div>
                  <TypeLines
                    lines={[
                      { text: "Certaines missions seront simples.", style: "text-base md:text-lg font-body text-white/60 text-center" },
                      { text: "D'autres te feront douter.", style: "text-base md:text-lg font-body text-white/60 text-center" },
                      { text: "Chaque décision te rapproche de la vérité.", style: "text-base md:text-lg font-body text-white/80 text-center font-medium" },
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
            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
            style={{ background: "hsl(var(--background))" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
          >
            <div className="absolute inset-0 scanline pointer-events-none" />
            <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-7 max-w-lg">
              {/* Classified stamp */}
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                <span className="classified-stamp text-xs">CLASSIFIÉ — NIVEAU OMEGA</span>
              </motion.div>

              {/* Portrait petit */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="w-24 rounded-xl overflow-hidden"
                style={{ boxShadow: "0 0 24px hsl(var(--gold-glow) / 0.3)" }}
              >
                <img src={jasperImg} alt="J. Velcourt" className="w-full object-cover" />
              </motion.div>

              {/* Logo */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8 }}>
                <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground tracking-tight leading-tight">
                  WORLD ESCAPE
                  <br />
                  <span
                    className="font-display font-bold"
                    style={{ color: "hsl(var(--primary))", textShadow: "0 0 30px hsl(var(--gold-glow) / 0.5), 0 0 60px hsl(var(--gold-glow) / 0.2)" }}
                  >
                    PROTOCOL
                  </span>
                </h1>
                <p className="mt-2 text-sm font-display tracking-[0.3em]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  SAISON 1
                </p>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3, duration: 0.7 }}
                className="flex flex-col sm:flex-row gap-4 w-full"
              >
                <button
                  onClick={onComplete}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-display tracking-widest text-sm transition-all border-glow"
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                >
                  <ChevronRight className="h-4 w-4" />
                  COMMENCER L'ENQUÊTE
                </button>
                <button
                  onClick={skip}
                  className="flex items-center justify-center gap-2 px-5 py-4 rounded-lg font-display tracking-widest text-sm transition-all border"
                  style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}
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
