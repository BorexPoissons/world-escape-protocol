import { supabase } from "@/integrations/supabase/client";

export const BADGE_KEYS = {
  FIRST_MISSION: "first_mission",
  PERFECT_RUN: "perfect_run",
  NO_HINTS: "no_hints",
  SPEED_RUNNER: "speed_runner",
  STREAK_5: "streak_5",
  TRUTH_SEEKER: "truth_seeker",
  HIGH_TRUST: "high_trust",
  MOST_WANTED: "most_wanted",
  WORLD_10: "world_10",
  XP_1000: "xp_1000",
} as const;

export type BadgeKey = (typeof BADGE_KEYS)[keyof typeof BADGE_KEYS];

export interface BadgeAwardContext {
  userId: string;
  score: number;
  total: number;
  timeElapsed: number; // seconds
  usedHint: boolean;
  ignoredFakeClue: boolean; // false_hint shown but didn't affect score
  missionCount: number; // total missions completed
  streak: number;
  trustLevel: number;
  suspicionLevel: number;
  completedCountries: number;
  xp: number;
}

async function awardBadge(userId: string, key: BadgeKey): Promise<boolean> {
  const { error } = await supabase
    .from("user_badges")
    .insert({ user_id: userId, badge_key: key });
  return !error; // returns false if already exists (unique constraint)
}

export async function checkAndAwardBadges(ctx: BadgeAwardContext): Promise<BadgeKey[]> {
  const awarded: BadgeKey[] = [];

  const checks: Array<[BadgeKey, boolean]> = [
    [BADGE_KEYS.FIRST_MISSION, ctx.missionCount === 1],
    [BADGE_KEYS.PERFECT_RUN, ctx.score === ctx.total && ctx.total > 0],
    [BADGE_KEYS.NO_HINTS, !ctx.usedHint],
    [BADGE_KEYS.SPEED_RUNNER, ctx.timeElapsed <= 90],
    [BADGE_KEYS.STREAK_5, ctx.streak >= 5],
    [BADGE_KEYS.TRUTH_SEEKER, ctx.ignoredFakeClue],
    [BADGE_KEYS.HIGH_TRUST, ctx.trustLevel >= 80],
    [BADGE_KEYS.MOST_WANTED, ctx.suspicionLevel >= 80],
    [BADGE_KEYS.WORLD_10, ctx.completedCountries >= 10],
    [BADGE_KEYS.XP_1000, ctx.xp >= 1000],
  ];

  for (const [key, condition] of checks) {
    if (condition) {
      const ok = await awardBadge(ctx.userId, key);
      if (ok) awarded.push(key);
    }
  }

  return awarded;
}

export const BADGE_META: Record<BadgeKey, { name: string; icon: string; description: string }> = {
  first_mission: { name: "Premier Contact", icon: "🎯", description: "Complétez votre première mission" },
  perfect_run: { name: "Course Parfaite", icon: "⭐", description: "4/4 sans erreur" },
  no_hints: { name: "Esprit Pur", icon: "🧠", description: "Sans utiliser d'indice" },
  speed_runner: { name: "Éclair", icon: "⚡", description: "Mission en moins de 90 secondes" },
  streak_5: { name: "Sur la Lancée", icon: "🔥", description: "5 missions sans échec" },
  truth_seeker: { name: "Détecteur de Mensonges", icon: "🔍", description: "Faux indice ignoré" },
  high_trust: { name: "Agent de Confiance", icon: "🤝", description: "Confiance ≥ 80" },
  most_wanted: { name: "Ennemi Public", icon: "⚠️", description: "Suspicion ≥ 80" },
  world_10: { name: "Globe-Trotter", icon: "🌍", description: "10 pays complétés" },
  xp_1000: { name: "Expert Terrain", icon: "💎", description: "1000 XP atteints" },
};
