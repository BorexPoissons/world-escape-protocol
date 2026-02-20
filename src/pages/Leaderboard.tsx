import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Trophy, Home, ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeaderboardEntry {
  display_name: string;
  xp: number;
  level: number;
  subscription_type: string;
  rank: number;
}

const TITLE_THRESHOLDS = [
  { min: 100, title: "MAÎTRE DU PROTOCOLE", color: "hsl(0 70% 58%)" },
  { min: 50, title: "ARCHITECTE", color: "hsl(280 65% 62%)" },
  { min: 20, title: "STRATÈGE", color: "hsl(160 60% 52%)" },
  { min: 5, title: "AGENT", color: "hsl(220 80% 65%)" },
  { min: 0, title: "EXPLORATEUR", color: "hsl(40 85% 62%)" },
];

const TOTAL_COUNTRIES = 195;

function getTitle(xp: number): { title: string; color: string } {
  // Rough estimate: level = floor(xp/200)+1, global% = completedCountries/195*100
  // For display, use XP tiers as proxy
  if (xp >= 5000) return TITLE_THRESHOLDS[0];
  if (xp >= 1000) return TITLE_THRESHOLDS[1];
  if (xp >= 400) return TITLE_THRESHOLDS[2];
  if (xp >= 100) return TITLE_THRESHOLDS[3];
  return TITLE_THRESHOLDS[4];
}

function getTierBadge(subscriptionType: string) {
  if (subscriptionType === "director") return { label: "DIRECTEUR", color: "hsl(0 70% 58%)" };
  if (subscriptionType === "agent" || subscriptionType === "season1") return { label: "AGENT", color: "hsl(220 80% 65%)" };
  return { label: "FREE", color: "hsl(220 20% 55%)" };
}

function getRankMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myProfile, setMyProfile] = useState<{ display_name: string | null; xp: number } | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [user]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // Call the security-definer function to get public leaderboard
      const { data, error } = await (supabase as any).rpc("get_leaderboard", { p_limit: 50 });

      if (error) throw error;

      const list = (data as LeaderboardEntry[]) || [];
      setEntries(list);

      // Find current user's rank
      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, xp, leaderboard_visible")
          .eq("user_id", user.id)
          .single();

        if (prof) {
          setMyProfile({ display_name: (prof as any).display_name, xp: (prof as any).xp });
          const myEntry = list.find((e) => e.display_name === (prof as any).display_name);
          if (myEntry) setMyRank(myEntry.rank);
        }
      }
    } catch (e) {
      console.error("Leaderboard error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors mr-1">
              <Home className="h-4 w-4" />
              <span className="text-xs font-display tracking-wider hidden sm:inline">ACCUEIL</span>
            </Link>
            <span className="text-border">|</span>
            <Link to="/dashboard" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors ml-1">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-display tracking-wider hidden sm:inline">DASHBOARD</span>
            </Link>
            <span className="text-border">|</span>
            <Shield className="h-5 w-5 text-primary ml-1" />
            <h1 className="font-display text-base font-bold text-primary tracking-wider">W.E.P. · CLASSEMENT</h1>
          </div>
          <div className="flex items-center gap-3">
            {myRank && (
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-muted-foreground font-display tracking-wider">VOTRE RANG</p>
                <p className="text-sm font-display font-bold" style={{ color: "hsl(var(--gold-glow))" }}>
                  #{myRank}
                </p>
              </div>
            )}
            {!user && (
              <Link to="/auth">
                <Button size="sm" className="font-display tracking-wider text-xs">SE CONNECTER</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <Trophy className="h-6 w-6" style={{ color: "hsl(var(--gold-glow))" }} />
            <h2
              className="text-3xl font-display font-bold tracking-widest"
              style={{ color: "hsl(var(--gold-glow))" }}
            >
              CLASSEMENT DES AGENTS
            </h2>
            <Trophy className="h-6 w-6" style={{ color: "hsl(var(--gold-glow))" }} />
          </div>
          <p className="text-sm text-muted-foreground font-display tracking-wider">
            Les agents les plus actifs du réseau W.E.P. — classés par XP total
          </p>
          {user && myRank && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full border font-display tracking-wider text-sm"
              style={{
                borderColor: "hsl(var(--gold-glow) / 0.5)",
                background: "hsl(var(--gold-glow) / 0.07)",
                color: "hsl(var(--gold-glow))",
              }}
            >
              <Star className="h-3.5 w-3.5" />
              VOTRE RANG MONDIAL : #{myRank}
            </motion.div>
          )}
        </motion.div>

        {/* Leaderboard table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground font-display tracking-wider text-sm">CHARGEMENT DU CLASSEMENT...</p>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-display tracking-wider">Aucun agent dans le classement pour le moment.</p>
            <p className="text-sm text-muted-foreground mt-2">Jouez des missions et activez la visibilité dans votre dashboard !</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Top 3 podium */}
            {entries.length >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="grid grid-cols-3 gap-3 mb-8"
              >
                {/* 2nd place */}
                {entries[1] && (
                  <div className="flex flex-col items-center text-center pt-6">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl mb-2 border"
                      style={{
                        background: "hsl(220 15% 12%)",
                        borderColor: "hsl(220 25% 35%)",
                        boxShadow: "0 0 20px hsl(220 25% 35% / 0.3)",
                      }}
                    >
                      🥈
                    </div>
                    <p className="text-xs font-display tracking-wider text-foreground truncate w-full">{entries[1].display_name}</p>
                    <p className="text-[10px] text-muted-foreground font-display mt-0.5">{entries[1].xp} XP</p>
                    <p className="text-[9px] font-display tracking-wider mt-0.5" style={{ color: getTitle(entries[1].xp).color }}>
                      {getTitle(entries[1].xp).title}
                    </p>
                  </div>
                )}
                {/* 1st place */}
                {entries[0] && (
                  <div className="flex flex-col items-center text-center">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2.5 }}
                      className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl mb-2 border"
                      style={{
                        background: "linear-gradient(135deg, hsl(40 70% 10%), hsl(40 90% 16%))",
                        borderColor: "hsl(var(--gold-glow) / 0.7)",
                        boxShadow: "0 0 30px hsl(var(--gold-glow) / 0.4)",
                      }}
                    >
                      🥇
                    </motion.div>
                    <p className="text-sm font-display font-bold tracking-wider text-foreground truncate w-full">{entries[0].display_name}</p>
                    <p className="text-xs font-display mt-0.5" style={{ color: "hsl(var(--gold-glow))" }}>{entries[0].xp} XP</p>
                    <p className="text-[9px] font-display tracking-wider mt-0.5" style={{ color: getTitle(entries[0].xp).color }}>
                      {getTitle(entries[0].xp).title}
                    </p>
                  </div>
                )}
                {/* 3rd place */}
                {entries[2] && (
                  <div className="flex flex-col items-center text-center pt-8">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-xl mb-2 border"
                      style={{
                        background: "hsl(25 30% 12%)",
                        borderColor: "hsl(25 40% 35%)",
                        boxShadow: "0 0 20px hsl(25 40% 35% / 0.3)",
                      }}
                    >
                      🥉
                    </div>
                    <p className="text-xs font-display tracking-wider text-foreground truncate w-full">{entries[2].display_name}</p>
                    <p className="text-[10px] text-muted-foreground font-display mt-0.5">{entries[2].xp} XP</p>
                    <p className="text-[9px] font-display tracking-wider mt-0.5" style={{ color: getTitle(entries[2].xp).color }}>
                      {getTitle(entries[2].xp).title}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Full ranking list */}
            <div
              className="rounded-xl overflow-hidden border"
              style={{ borderColor: "hsl(var(--gold-glow) / 0.2)" }}
            >
              {/* Column headers */}
              <div
                className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[10px] font-display tracking-widest text-muted-foreground"
                style={{ background: "hsl(var(--gold-glow) / 0.05)", borderBottom: "1px solid hsl(var(--gold-glow) / 0.15)" }}
              >
                <span className="col-span-1 text-center">#</span>
                <span className="col-span-5">AGENT</span>
                <span className="col-span-2 text-center">NIV.</span>
                <span className="col-span-2 text-center">TIER</span>
                <span className="col-span-2 text-right">XP</span>
              </div>

              <AnimatePresence>
                {entries.map((entry, idx) => {
                  const isMe = myProfile?.display_name === entry.display_name;
                  const tier = getTierBadge(entry.subscription_type);
                  const title = getTitle(entry.xp);
                  const medal = getRankMedal(entry.rank);

                  return (
                    <motion.div
                      key={entry.display_name}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.03 }}
                      className="grid grid-cols-12 gap-2 px-4 py-3.5 items-center transition-colors"
                      style={{
                        background: isMe
                          ? "hsl(var(--gold-glow) / 0.07)"
                          : idx % 2 === 0
                          ? "transparent"
                          : "hsl(var(--card) / 0.3)",
                        borderBottom: "1px solid hsl(var(--border) / 0.15)",
                        boxShadow: isMe ? "inset 0 0 0 1px hsl(var(--gold-glow) / 0.3)" : "none",
                      }}
                    >
                      {/* Rank */}
                      <div className="col-span-1 text-center">
                        {medal ? (
                          <span className="text-base">{medal}</span>
                        ) : (
                          <span
                            className="text-xs font-display font-bold tabular-nums"
                            style={{ color: isMe ? "hsl(var(--gold-glow))" : "hsl(var(--muted-foreground) / 0.6)" }}
                          >
                            {entry.rank}
                          </span>
                        )}
                      </div>

                      {/* Name + title */}
                      <div className="col-span-5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p
                            className="text-sm font-display font-semibold truncate"
                            style={{ color: isMe ? "hsl(var(--gold-glow))" : "hsl(var(--foreground))" }}
                          >
                            {entry.display_name}
                            {isMe && <span className="ml-1 text-[10px] opacity-70">(vous)</span>}
                          </p>
                        </div>
                        <p className="text-[10px] font-display tracking-wider" style={{ color: title.color }}>
                          {title.title}
                        </p>
                      </div>

                      {/* Level */}
                      <div className="col-span-2 text-center">
                        <span
                          className="text-sm font-display font-bold tabular-nums"
                          style={{ color: isMe ? "hsl(var(--gold-glow))" : "hsl(var(--foreground))" }}
                        >
                          {entry.level}
                        </span>
                      </div>

                      {/* Tier badge */}
                      <div className="col-span-2 text-center">
                        <span
                          className="text-[9px] font-display tracking-wider px-1.5 py-0.5 rounded border"
                          style={{
                            color: tier.color,
                            borderColor: `${tier.color}55`,
                            background: `${tier.color}15`,
                          }}
                        >
                          {tier.label}
                        </span>
                      </div>

                      {/* XP */}
                      <div className="col-span-2 text-right">
                        <span
                          className="text-sm font-display font-bold tabular-nums"
                          style={{ color: isMe ? "hsl(var(--gold-glow))" : "hsl(var(--primary))" }}
                        >
                          {entry.xp.toLocaleString()}
                        </span>
                        <p className="text-[9px] text-muted-foreground font-display">XP</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Footer note */}
            <p className="text-center text-[11px] text-muted-foreground/50 font-display tracking-wider mt-4">
              Seuls les agents ayant activé la visibilité publique apparaissent ici
            </p>
          </div>
        )}

        {/* CTA if not logged in */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-10 text-center rounded-xl p-8 border"
            style={{
              borderColor: "hsl(var(--primary) / 0.3)",
              background: "hsl(var(--card))",
            }}
          >
            <Trophy className="h-10 w-10 mx-auto mb-4" style={{ color: "hsl(var(--gold-glow))" }} />
            <h3 className="font-display text-lg font-bold tracking-wider text-foreground mb-2">
              REJOIGNEZ LE CLASSEMENT
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              Créez un compte, jouez des missions et accumulez des XP pour apparaître parmi les meilleurs agents.
            </p>
            <Link to="/auth">
              <Button className="font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90">
                CRÉER UN COMPTE
              </Button>
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
