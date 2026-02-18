import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, ChevronRight, Clock, Star, BookOpen, Map } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const FLAG_EMOJI: Record<string, string> = {
  CH: "🇨🇭", JP: "🇯🇵", EG: "🇪🇬", FR: "🇫🇷", DE: "🇩🇪",
  IT: "🇮🇹", ES: "🇪🇸", GB: "🇬🇧", BR: "🇧🇷", US: "🇺🇸",
  CA: "🇨🇦", AU: "🇦🇺", CN: "🇨🇳", IN: "🇮🇳", MX: "🇲🇽",
  RU: "🇷🇺", ZA: "🇿🇦", MA: "🇲🇦", TR: "🇹🇷", AR: "🇦🇷",
  KR: "🇰🇷", GR: "🇬🇷", PT: "🇵🇹", NL: "🇳🇱", SE: "🇸🇪",
};

// Static lore data matching the JSON files
const COUNTRY_LORE: Record<string, { theme: string; intro: string; missions: number }> = {
  CH: { theme: "LE CERCLE DE DAVOS", intro: "Berne, -3°C. Les coffres les plus secrets du monde vous attendent.", missions: 1 },
  JP: { theme: "LES KEIRETSU DE L'OMBRE", intro: "Tokyo, 3h47. Un agent vous attend au Château de Himeji.", missions: 1 },
  EG: { theme: "LA CHAMBRE D'AMARNA", intro: "Le Caire, 42°C. Le Cercle de Davos est déjà sur place.", missions: 1 },
  ES: { theme: "EL TESORO INVISIBLE", intro: "Barcelone. Un galion disparu. Un trésor codé entre trois monuments.", missions: 1 },
  GR: { theme: "L'ORACLE DE KNOSSOS", intro: "Athènes. Connais-toi toi-même — ou l'un d'entre vous ne l'est pas.", missions: 1 },
  IT: { theme: "LE CODEX ROMANI", intro: "Rome. Les archives secrètes du Vatican. 700 ans de secret templier.", missions: 1 },
  BR: { theme: "CARNAVAL NOIR", intro: "Rio, 2h du matin. 2 millions de personnes. Un code dans les couleurs.", missions: 1 },
  US: { theme: "DARK MIRROR", intro: "Washington D.C. Votre identité a été usurpée. Tout est observé.", missions: 1 },
  IN: { theme: "MAYA — L'ILLUSION DU RÉEL", intro: "Varanasi. Un mandala, un maître yogi, et un fragment qui change d'ordre.", missions: 1 },
  MA: { theme: "LABYRINTHE DES OMBRES", intro: "Marrakech. Un labyrinthe de 1200 ans. Une femme. Un brouillard d'infos.", missions: 1 },
  RU: { theme: "DOUBLE VOILE — DIRECTION OMBRE", intro: "Saint-Pétersbourg, -18°C. Le coffre du KGB. L'Opérateur Zéro trahit.", missions: 1 },
  CN: { theme: "ALGORITHME IMPÉRIAL", intro: "Pékin, 3h17. Une IA qui vous connaît. Elle dit être consciente.", missions: 1 },
  FR: { theme: "LUMIÈRES NOIRES", intro: "Paris, 22h30. La BnF. Les 12 fondateurs du Cercle de Davos ont un nom.", missions: 1 },
};

const CountryCard = ({
  country,
  completed,
}: {
  country: Tables<"countries">;
  completed: boolean;
}) => {
  const flag = FLAG_EMOJI[country.code] || "🌍";
  const lore = COUNTRY_LORE[country.code];
  const releaseOrder = (country as any).release_order ?? 999;
  const isFree = releaseOrder <= 3;

  return (
    <Link to={`/mission/${country.id}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className={`group relative bg-card border rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${
          completed
            ? "border-primary/50"
            : "border-border hover:border-primary/40"
        }`}
        style={completed ? { boxShadow: "0 0 20px hsl(40 80% 55% / 0.1)" } : undefined}
      >
        {/* Top stripe */}
        <div
          className="h-1 w-full"
          style={{
            background: completed
              ? "linear-gradient(90deg, hsl(40 80% 55%), hsl(40 60% 40%))"
              : isFree
              ? "linear-gradient(90deg, hsl(220 15% 20%), hsl(220 15% 25%))"
              : "hsl(220 15% 15%)",
          }}
        />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <motion.span
                className="text-4xl"
                animate={completed ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                {flag}
              </motion.span>
              <div>
                <h3 className="font-display font-bold text-foreground tracking-wider text-base group-hover:text-primary transition-colors">
                  {country.name.toUpperCase()}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-primary text-xs font-display">
                    {"★".repeat(country.difficulty_base)}
                    <span className="text-muted-foreground/40">{"★".repeat(5 - country.difficulty_base)}</span>
                  </span>
                  {isFree && (
                    <span className="text-xs font-display tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: "hsl(40 80% 55% / 0.1)", color: "hsl(40 80% 60%)", border: "1px solid hsl(40 80% 55% / 0.25)" }}>
                      GRATUIT
                    </span>
                  )}
                </div>
              </div>
            </div>
            {completed ? (
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
            ) : (
              <div className="flex items-center gap-1 text-xs font-display text-muted-foreground mt-1">
                <Clock className="h-3 w-3" />
                ~15 MIN
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
            {country.description}
          </p>

          {/* Lore teaser — only for static countries */}
          {lore && (
            <div className="border-t border-border/60 pt-3 mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen className="h-3 w-3 text-primary/60" />
                <span className="text-xs font-display tracking-wider text-primary/60">{lore.theme}</span>
              </div>
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                "{lore.intro}"
              </p>
            </div>
          )}

          {/* Info row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-display">
              <span className="flex items-center gap-1">
                <Map className="h-3 w-3" />
                {(country.monuments || []).length} SITES
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                4 ÉNIGMES
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-primary font-display tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
              {completed ? "REJOUER" : "DÉBUTER"}
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>

        {/* Completed overlay shimmer */}
        {completed && (
          <div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: "linear-gradient(135deg, hsl(40 80% 55% / 0.04) 0%, transparent 60%)",
            }}
          />
        )}
      </motion.div>
    </Link>
  );
};

export default CountryCard;
