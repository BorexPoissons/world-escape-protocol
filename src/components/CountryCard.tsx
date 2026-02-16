import { Link } from "react-router-dom";
import { Lock, CheckCircle, ChevronRight } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const flagEmoji: Record<string, string> = {
  CH: "🇨🇭",
  JP: "🇯🇵",
  EG: "🇪🇬",
};

const CountryCard = ({
  country,
  completed,
}: {
  country: Tables<"countries">;
  completed: boolean;
}) => {
  return (
    <Link to={`/mission/${country.id}`}>
      <div className={`group relative bg-card border rounded-lg p-6 transition-all duration-300 hover:border-primary/50 hover:border-glow cursor-pointer ${completed ? "border-primary/30" : "border-border"}`}>
        {/* Status badge */}
        <div className="absolute top-4 right-4">
          {completed ? (
            <CheckCircle className="h-5 w-5 text-primary" />
          ) : (
            <Lock className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Flag & Name */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{flagEmoji[country.code] || "🏳️"}</span>
          <div>
            <h3 className="font-display font-bold text-foreground tracking-wider text-lg">
              {country.name.toUpperCase()}
            </h3>
            <p className="text-xs text-muted-foreground font-display">
              DIFFICULTÉ: {"★".repeat(country.difficulty_base)}{"☆".repeat(5 - country.difficulty_base)}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{country.description}</p>

        {/* Action */}
        <div className="flex items-center text-sm text-primary font-display tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
          {completed ? "REVOIR LA MISSION" : "LANCER LA MISSION"}
          <ChevronRight className="h-4 w-4 ml-1" />
        </div>
      </div>
    </Link>
  );
};

export default CountryCard;
