import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, SkipForward } from "lucide-react";

interface IntroScreenProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    id: 1,
    duration: 5000,
    content: (
      <div className="flex items-center justify-center h-full">
        <p className="text-3xl md:text-5xl font-display text-white text-center leading-relaxed tracking-wide">
          Le monde n'est pas ce qu'il paraît.
        </p>
      </div>
    ),
    bg: "bg-black",
  },
  {
    id: 2,
    duration: 6000,
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-2xl md:text-4xl font-display text-white leading-relaxed"
        >
          Des décisions majeures sont prises dans l'ombre.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="text-lg md:text-2xl font-display tracking-widest"
          style={{ color: "hsl(var(--primary))" }}
        >
          Finance.&nbsp;&nbsp;Énergie.&nbsp;&nbsp;Technologie.
        </motion.p>
      </div>
    ),
    bg: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
    overlay: (
      <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5 bg-cover bg-center scale-105 transition-transform duration-[6000ms]" />
    ),
  },
  {
    id: 3,
    duration: 7000,
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-8 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-xl md:text-3xl font-body text-white/70"
        >
          Un nom revient dans les archives confidentielles :
        </motion.p>
        <motion.p
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="text-3xl md:text-5xl font-display font-bold tracking-widest"
          style={{ color: "hsl(var(--primary))", textShadow: "0 0 30px hsl(var(--gold-glow) / 0.5), 0 0 60px hsl(var(--gold-glow) / 0.2)" }}
        >
          LE CERCLE.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.4 }}
          className="text-lg md:text-2xl font-display text-white/80"
        >
          Jasper Velcourt est sur leur trace.
        </motion.p>
      </div>
    ),
    bg: "bg-gradient-to-b from-slate-950 via-zinc-900 to-slate-950",
  },
  {
    id: 4,
    duration: 6000,
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-2xl md:text-4xl font-display text-white/90"
        >
          195 pays.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="text-2xl md:text-4xl font-display text-white/90"
        >
          195 fragments.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.7 }}
          className="text-3xl md:text-5xl font-display font-bold mt-2"
          style={{
            color: "hsl(var(--primary))",
            textShadow: "0 0 40px hsl(var(--gold-glow) / 0.6), 0 0 80px hsl(var(--gold-glow) / 0.3)",
          }}
        >
          Une seule vérité.
        </motion.p>
      </div>
    ),
    bg: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
  },
];

const FINAL_SCREEN_DURATION = 0; // stays until user clicks

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [showFinal, setShowFinal] = useState(false);

  const skip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const advance = useCallback(() => {
    if (slideIndex < SLIDES.length - 1) {
      setSlideIndex((i) => i + 1);
    } else {
      setShowFinal(true);
    }
  }, [slideIndex]);

  // Auto-advance timer
  useEffect(() => {
    if (showFinal) return;
    const slide = SLIDES[slideIndex];
    const timer = setTimeout(advance, slide.duration);
    return () => clearTimeout(timer);
  }, [slideIndex, showFinal, advance]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ fontFamily: "inherit" }}>
      {/* Skip button — always visible */}
      {!showFinal && (
        <button
          onClick={skip}
          className="absolute top-5 right-5 z-50 flex items-center gap-1.5 text-xs tracking-widest font-display px-3 py-1.5 rounded border transition-all"
          style={{
            color: "hsl(var(--muted-foreground))",
            borderColor: "hsl(var(--border))",
            background: "hsl(var(--background) / 0.7)",
          }}
        >
          <SkipForward className="h-3 w-3" />
          PASSER
        </button>
      )}

      <AnimatePresence mode="wait">
        {!showFinal ? (
          /* ——— SLIDES ——— */
          <motion.div
            key={`slide-${slideIndex}`}
            className={`absolute inset-0 ${SLIDES[slideIndex].bg}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            {/* Optional BG overlay for slide 2 */}
            {SLIDES[slideIndex].overlay}

            {/* Grid texture */}
            <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />

            {/* Slide content */}
            <div className="relative z-10 h-full">
              {SLIDES[slideIndex].content}
            </div>

            {/* Progress dots */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
              {SLIDES.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: i === slideIndex ? "2rem" : "0.5rem",
                    backgroundColor: i === slideIndex
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted-foreground) / 0.4)",
                  }}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          /* ——— FINAL SCREEN ——— */
          <motion.div
            key="final"
            className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center"
            style={{ background: "hsl(var(--background))" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
          >
            {/* Scanline */}
            <div className="absolute inset-0 scanline pointer-events-none" />
            {/* Grid */}
            <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-6">
              {/* Classified badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className="classified-stamp text-xs">CLASSIFIÉ — NIVEAU OMEGA</span>
              </motion.div>

              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="flex flex-col items-center"
              >
                <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground tracking-tight leading-tight">
                  WORLD ESCAPE
                  <br />
                  <span
                    className="font-display font-bold"
                    style={{
                      color: "hsl(var(--primary))",
                      textShadow: "0 0 20px hsl(var(--gold-glow) / 0.4), 0 0 40px hsl(var(--gold-glow) / 0.2)",
                    }}
                  >
                    PROTOCOL
                  </span>
                </h1>
                <p
                  className="mt-2 text-sm font-display tracking-[0.3em]"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  SAISON 1
                </p>
              </motion.div>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.7 }}
                className="flex flex-col sm:flex-row gap-4 mt-4"
              >
                <button
                  onClick={onComplete}
                  className="flex items-center gap-2 px-8 py-4 rounded-lg font-display tracking-widest text-sm transition-all border-glow"
                  style={{
                    background: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                  COMMENCER L'ENQUÊTE
                </button>

                <button
                  onClick={skip}
                  className="flex items-center gap-2 px-6 py-4 rounded-lg font-display tracking-widest text-sm transition-all border"
                  style={{
                    borderColor: "hsl(var(--border))",
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  <SkipForward className="h-4 w-4" />
                  PASSER L'INTRODUCTION
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
