/**
 * FinalRevealSequence — Séquence cinématique 7 actes déclenchée quand le joueur
 * place sa 195e pièce sur la carte mondiale W.E.P.
 *
 * ACTE 1 — Snap final + freeze (0–3s)
 * ACTE 2 — Onde de choc SVG (3–6s)
 * ACTE 3 — Révélation de la carte (6–12s)
 * ACTE 4 — Cristallisation du symbole central (8–14s)
 * ACTE 5 — Message de Jasper (12–20s) — typing effet
 * ACTE 6 — Badge MAÎTRE DU PROTOCOLE (18–22s)
 * ACTE 7 — État final permanent
 */

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jasperImg from "@/assets/jasper-velcourt.png";

interface FinalRevealSequenceProps {
  onDismiss: () => void;
  onSaveTitle?: () => Promise<void>;
  lastCountryX?: number; // % of map width for shockwave origin
  lastCountryY?: number; // % of map height
}

// Lines for the typing effect — ACTE 5
const JASPER_LINES = [
  { text: "TRANSMISSION CHIFFRÉE — NIVEAU DIRECTEUR", type: "header" },
  { text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", type: "separator" },
  { text: "", type: "spacer" },
  { text: `"Le Cercle n'est pas une organisation.`, type: "quote" },
  { text: ` C'est une architecture."`, type: "quote" },
  { text: "", type: "spacer" },
  { text: "                        — JASPER VELCOURT", type: "attribution" },
  { text: "                          AGENT PRINCIPAL W.E.P.", type: "attribution" },
  { text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", type: "separator" },
  { text: "PROTOCOLE OMÉGA : COMPLÉTÉ", type: "status" },
  { text: "195 TERRITOIRES · 975 FRAGMENTS · 1 VÉRITÉ", type: "status" },
];

// Strategic node positions (same as RevealOverlay)
const STRATEGIC_NODES = [
  { x: 22.0, y: 18.2 },
  { x: 77.8, y: 23.7 },
  { x: 51.0, y: 14.9 },
  { x: 64.8, y: 29.2 },
  { x: 31.9, y: 31.9 },
];

// ── Typing line component ──────────────────────────────────────────────────────
function TypingLine({
  text,
  type,
  delay,
  onComplete,
}: {
  text: string;
  type: string;
  delay: number;
  onComplete?: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true);
      onComplete?.();
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [delay, onComplete]);

  const color =
    type === "header" ? "hsl(40 85% 72%)" :
    type === "separator" ? "hsl(40 40% 40%)" :
    type === "quote" ? "hsl(0 65% 68%)" :
    type === "attribution" ? "hsl(40 60% 55%)" :
    type === "status" ? "hsl(160 60% 55%)" :
    "transparent";

  if (type === "spacer") return <div className="h-2" />;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="font-mono text-xs leading-relaxed tracking-wider whitespace-pre"
          style={{ color }}
        >
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Shockwave SVG component ────────────────────────────────────────────────────
function Shockwave({ cx, cy, active }: { cx: number; cy: number; active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-[90]"
          viewBox="0 0 100 56.25"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="shockGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Main shockwave ring */}
          <motion.circle
            cx={cx} cy={cy * 0.5625}
            fill="none"
            stroke="hsl(0 0% 100%)"
            strokeWidth={0.6}
            filter="url(#shockGlow)"
            initial={{ r: 0, opacity: 1 }}
            animate={{ r: [0, 8, 80], opacity: [1, 1, 0], stroke: ["hsl(0 0% 100%)", "hsl(0 0% 100%)", "hsl(40 90% 72%)"] }}
            transition={{ duration: 2.8, ease: "easeOut" }}
          />

          {/* Second delayed ring */}
          <motion.circle
            cx={cx} cy={cy * 0.5625}
            fill="none"
            stroke="hsl(40 90% 72%)"
            strokeWidth={0.35}
            filter="url(#shockGlow)"
            initial={{ r: 0, opacity: 0 }}
            animate={{ r: [0, 60, 150], opacity: [0, 0.7, 0] }}
            transition={{ duration: 3.2, delay: 0.4, ease: "easeOut" }}
          />

          {/* Node illumination bursts at strategic positions */}
          {STRATEGIC_NODES.map((n, i) => (
            <motion.circle
              key={i}
              cx={n.x} cy={n.y * 0.5625} r={1.5}
              fill="hsl(40 90% 80%)"
              filter="url(#shockGlow)"
              initial={{ opacity: 0, r: 0.5 }}
              animate={{ opacity: [0, 1, 0.5, 0], r: [0.5, 3, 2, 1.5] }}
              transition={{ duration: 1.5, delay: 0.5 + i * 0.2, ease: "easeOut" }}
            />
          ))}

          {/* All intercontinental lines turn gold */}
          {[
            [22, 18.2, 51, 14.9], [51, 14.9, 77.8, 23.7], [77.8, 23.7, 64.8, 29.2],
            [64.8, 29.2, 31.9, 31.9], [31.9, 31.9, 22, 18.2],
            [22, 18.2, 77.8, 23.7], [51, 14.9, 64.8, 29.2],
          ].map(([x1, y1, x2, y2], i) => (
            <motion.line
              key={`gl-${i}`}
              x1={x1} y1={y1 * 0.5625} x2={x2} y2={y2 * 0.5625}
              stroke="hsl(40 90% 65%)"
              strokeWidth={0.25}
              filter="url(#shockGlow)"
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: [0, 0.9, 0.6], pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.8 + i * 0.15, ease: "easeOut" }}
            />
          ))}
        </svg>
      )}
    </AnimatePresence>
  );
}

// ── Central Symbol Crystallization ────────────────────────────────────────────
function CrystalSymbol({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-[85]"
          viewBox="0 0 100 56.25"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="crystalGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="0.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="crystalCore" cx="50%" cy="50%">
              <stop offset="0%" stopColor="hsl(40 90% 80%)" stopOpacity="0.9" />
              <stop offset="40%" stopColor="hsl(0 70% 58%)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(0 70% 45%)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Rotating outer ring (crystallized = stops) */}
          <motion.circle
            cx={50} cy={28.125} r={12}
            fill="none" stroke="hsl(40 90% 72%)" strokeWidth={0.35}
            filter="url(#crystalGlow)"
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            transition={{ opacity: { duration: 1 }, rotate: { duration: 3, ease: "easeInOut" } }}
            style={{ transformOrigin: "50px 28.125px" }}
          />

          {/* Inner glow */}
          <motion.circle
            cx={50} cy={28.125} r={8}
            fill="url(#crystalCore)"
            filter="url(#crystalGlow)"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
            style={{ transformOrigin: "50px 28.125px" }}
          />

          {/* Cross lines (sharp) */}
          <motion.line
            x1={50} y1={16} x2={50} y2={40}
            stroke="hsl(40 85% 70%)" strokeWidth={0.3}
            filter="url(#crystalGlow)"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 0.8, pathLength: 1 }}
            transition={{ duration: 1, delay: 1 }}
          />
          <motion.line
            x1={38} y1={28.125} x2={62} y2={28.125}
            stroke="hsl(40 85% 70%)" strokeWidth={0.3}
            filter="url(#crystalGlow)"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 0.8, pathLength: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
          />

          {/* Ω symbol at center */}
          <motion.text
            x={50} y={29.5}
            textAnchor="middle"
            fontSize="5"
            fill="hsl(40 90% 80%)"
            filter="url(#crystalGlow)"
            fontFamily="serif"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 1.8 }}
          >
            Ω
          </motion.text>

          {/* Lines converging from 5 nodes to center */}
          {STRATEGIC_NODES.map((n, i) => (
            <motion.line
              key={`conv-${i}`}
              x1={n.x} y1={n.y * 0.5625}
              x2={50} y2={28.125}
              stroke="hsl(40 75% 65%)" strokeWidth={0.18}
              strokeOpacity={0.55}
              filter="url(#crystalGlow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.5, delay: 0.5 + i * 0.2, ease: "easeOut" }}
            />
          ))}
        </svg>
      )}
    </AnimatePresence>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FinalRevealSequence({
  onDismiss,
  onSaveTitle,
  lastCountryX = 50,
  lastCountryY = 28,
}: FinalRevealSequenceProps) {
  const [step, setStep] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [titleSaved, setTitleSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const stepRef = useRef(0);

  // Advance steps via chained timeouts
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    const schedule = (targetStep: number, delayMs: number) => {
      timers.push(
        setTimeout(() => {
          stepRef.current = targetStep;
          setStep(targetStep);
        }, delayMs)
      );
    };

    schedule(1, 800);   // ACTE 1: freeze ends
    schedule(2, 3000);  // ACTE 2: shockwave
    schedule(3, 6000);  // ACTE 3: map reveal
    schedule(4, 8000);  // ACTE 4: symbol
    schedule(5, 12000); // ACTE 5: Jasper message
    schedule(6, 20000); // ACTE 6: badge
    schedule(7, 24000); // ACTE 7: final state

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleSaveTitle = async () => {
    if (titleSaved || saving) return;
    setSaving(true);
    await onSaveTitle?.();
    setSaving(false);
    setTitleSaved(true);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Dark overlay */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "hsl(220 25% 3%)" }}
        animate={{
          opacity: step >= 3 ? 0.55 : step >= 1 ? 0.85 : 1,
        }}
        transition={{ duration: 3, ease: "easeInOut" }}
      />

      {/* ── ACTE 1: Freeze screen + pulse flash ── */}
      <AnimatePresence>
        {step === 0 && (
          <motion.div
            className="absolute inset-0 z-[95] pointer-events-none"
            style={{ background: "hsl(0 0% 100%)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* HUD message ACTE 1 */}
      <AnimatePresence>
        {step >= 0 && step < 5 && (
          <motion.div
            className="absolute top-8 left-1/2 z-[96] pointer-events-none"
            style={{ transform: "translateX(-50%)" }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="text-xs font-mono tracking-[0.3em] px-6 py-2 rounded-full border"
              style={{
                background: "hsl(220 25% 4% / 0.9)",
                borderColor: "hsl(0 65% 48% / 0.7)",
                color: "hsl(0 70% 65%)",
                boxShadow: "0 0 20px hsl(0 65% 48% / 0.4)",
              }}
            >
              {step <= 1 && "⬢ CONVERGENCE COMPLÈTE — ANALYSE EN COURS…"}
              {step === 2 && "⬢ ONDE DE CHOC — RÉSEAU ACTIVÉ"}
              {step === 3 && "◈ RÉVÉLATION EN COURS — CARTE DÉCHIFFRÉE"}
              {step === 4 && "◉ CRISTALLISATION DU SYMBOLE CENTRAL"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACTE 2: Shockwave SVG ── */}
      <Shockwave cx={lastCountryX} cy={lastCountryY} active={step === 2} />

      {/* ── ACTE 4: Crystal symbol ── */}
      <CrystalSymbol active={step >= 4 && step < 6} />

      {/* ── ACTE 5: Message de Jasper ── */}
      <AnimatePresence>
        {step >= 5 && step < 6 && (
          <motion.div
            className="absolute inset-0 z-[92] flex items-center justify-center"
            style={{ backdropFilter: "blur(2px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <motion.div
              className="relative max-w-md w-full mx-4 px-8 py-8 rounded-2xl"
              style={{
                background: "hsl(220 25% 4% / 0.96)",
                border: "1px solid hsl(40 80% 55% / 0.3)",
                boxShadow: "0 0 60px hsl(40 80% 55% / 0.15), inset 0 0 40px hsl(220 25% 3% / 0.5)",
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Jasper portrait */}
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-full overflow-hidden border-2"
                  style={{ borderColor: "hsl(40 80% 55% / 0.6)" }}
                >
                  <img src={jasperImg} alt="Jasper Velcourt" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-[9px] font-mono tracking-[0.25em]" style={{ color: "hsl(40 80% 65%)" }}>JASPER VELCOURT</p>
                  <p className="text-[8px] font-mono tracking-wider" style={{ color: "hsl(220 10% 45%)" }}>AGENT PRINCIPAL W.E.P.</p>
                </div>
                <motion.div
                  className="ml-auto w-2 h-2 rounded-full"
                  style={{ background: "hsl(140 60% 50%)" }}
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                />
              </div>

              {/* Typing lines */}
              <div className="space-y-0.5">
                {JASPER_LINES.map((line, i) => (
                  <TypingLine
                    key={i}
                    text={line.text}
                    type={line.type}
                    delay={i * 0.55}
                    onComplete={i === JASPER_LINES.length - 1 ? () => setVisibleLines(i + 1) : undefined}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACTE 6: Badge MAÎTRE DU PROTOCOLE ── */}
      <AnimatePresence>
        {step >= 6 && step < 7 && (
          <motion.div
            className="absolute inset-0 z-[93] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <motion.div
              className="relative text-center px-10 py-10 rounded-2xl"
              style={{
                background: "hsl(220 25% 4% / 0.98)",
                border: "2px solid hsl(40 85% 62%)",
                boxShadow: "0 0 80px hsl(40 80% 55% / 0.3), inset 0 0 40px hsl(40 80% 55% / 0.04)",
                maxWidth: 400,
              }}
              initial={{ scale: 0.7, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            >
              {/* Animated corner borders */}
              {[
                "top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl",
                "top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl",
                "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl",
                "bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl",
              ].map((cls, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-6 h-6 ${cls}`}
                  style={{ borderColor: "hsl(40 90% 72%)" }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.5 }}
                />
              ))}

              {/* Ω icon */}
              <motion.div
                className="text-6xl mb-4"
                style={{ color: "hsl(40 90% 72%)", textShadow: "0 0 30px hsl(40 90% 72% / 0.6)" }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                Ω
              </motion.div>

              <motion.p
                className="text-[9px] font-mono tracking-[0.4em] mb-1"
                style={{ color: "hsl(40 60% 55%)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                W.E.P. · CLASSIFIED
              </motion.p>

              <motion.h2
                className="text-xl font-mono font-bold tracking-[0.2em] mb-1"
                style={{ color: "hsl(40 90% 72%)", textShadow: "0 0 20px hsl(40 90% 72% / 0.4)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                MAÎTRE DU PROTOCOLE
              </motion.h2>

              <motion.p
                className="text-[10px] font-mono tracking-[0.25em] mb-6"
                style={{ color: "hsl(220 10% 55%)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                AGENT #00195 · RÉVÉLATION TOTALE
              </motion.p>

              <motion.div
                className="h-px mb-6 mx-4"
                style={{ background: "linear-gradient(90deg, transparent, hsl(40 80% 55% / 0.5), transparent)" }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1 }}
              />

              <motion.div
                className="flex flex-col gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <button
                  onClick={handleSaveTitle}
                  disabled={titleSaved || saving}
                  className="w-full py-2.5 rounded-lg font-mono text-xs tracking-[0.2em] border transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: titleSaved ? "hsl(140 60% 40% / 0.2)" : "hsl(40 80% 55% / 0.15)",
                    borderColor: titleSaved ? "hsl(140 60% 50% / 0.5)" : "hsl(40 80% 55% / 0.5)",
                    color: titleSaved ? "hsl(140 60% 60%)" : "hsl(40 85% 72%)",
                  }}
                >
                  {saving ? "ENREGISTREMENT…" : titleSaved ? "✓ TITRE ENREGISTRÉ" : "[ ENREGISTRER MON TITRE ]"}
                </button>

                <button
                  onClick={onDismiss}
                  className="w-full py-2 rounded-lg font-mono text-xs tracking-[0.2em] border transition-all duration-200 hover:opacity-80"
                  style={{
                    borderColor: "hsl(220 15% 22%)",
                    color: "hsl(220 10% 50%)",
                  }}
                >
                  ACCÉDER À L'ÉTAT FINAL
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACTE 7: Final permanent HUD ── */}
      <AnimatePresence>
        {step >= 7 && (
          <motion.div
            className="absolute bottom-6 left-1/2 z-[96] pointer-events-none"
            style={{ transform: "translateX(-50%)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <div
              className="text-xs font-mono tracking-[0.25em] px-8 py-3 rounded-full border text-center"
              style={{
                background: "hsl(220 25% 4% / 0.92)",
                borderColor: "hsl(40 80% 55% / 0.5)",
                color: "hsl(40 85% 72%)",
                boxShadow: "0 0 30px hsl(40 80% 55% / 0.25)",
              }}
            >
              ✦ RÉVÉLATION TOTALE · LE PLAN EST COMPLET
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
