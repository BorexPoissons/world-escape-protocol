import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, reset_from } = await req.json();
    if (!user_id || !reset_from) {
      return new Response(JSON.stringify({ error: "Missing user_id or reset_from" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine which seasons to keep based on reset_from
    // "all" / "season0" = delete everything
    // "season1" = keep season 0 data, delete season 1+
    // "season2" = keep season 0 & 1 data, delete season 2+
    const keepSeasons: number[] = [];
    if (reset_from === "season1") keepSeasons.push(0);
    if (reset_from === "season2") { keepSeasons.push(0); keepSeasons.push(1); }

    // Get country codes to keep (based on seasons to keep)
    let keepCountryCodes: string[] = [];
    let keepCountryIds: string[] = [];

    if (keepSeasons.length > 0) {
      const { data: keepCountries } = await supabaseAdmin
        .from("countries")
        .select("id, code, season_number")
        .in("season_number", keepSeasons);

      if (keepCountries) {
        keepCountryCodes = keepCountries.map((c: any) => c.code);
        keepCountryIds = keepCountries.map((c: any) => c.id);
      }
    }

    const deleted: Record<string, number> = {};

    // 1. Delete missions (join via country_id -> countries -> season_number)
    if (keepCountryIds.length > 0) {
      // Delete missions whose country_id is NOT in keepCountryIds
      const { data: countriesToDelete } = await supabaseAdmin
        .from("countries")
        .select("id")
        .not("id", "in", `(${keepCountryIds.join(",")})`);
      const deleteIds = (countriesToDelete || []).map((c: any) => c.id);
      if (deleteIds.length > 0) {
        const { count } = await supabaseAdmin
          .from("missions")
          .delete({ count: "exact" })
          .eq("user_id", user_id)
          .in("country_id", deleteIds);
        deleted.missions = count || 0;
      }
    } else {
      const { count } = await supabaseAdmin
        .from("missions")
        .delete({ count: "exact" })
        .eq("user_id", user_id);
      deleted.missions = count || 0;
    }

    // 2. Delete player_country_progress
    if (keepCountryCodes.length > 0) {
      const { count } = await supabaseAdmin
        .from("player_country_progress")
        .delete({ count: "exact" })
        .eq("user_id", user_id)
        .not("country_code", "in", `(${keepCountryCodes.join(",")})`);
      deleted.player_country_progress = count || 0;
    } else {
      const { count } = await supabaseAdmin
        .from("player_country_progress")
        .delete({ count: "exact" })
        .eq("user_id", user_id);
      deleted.player_country_progress = count || 0;
    }

    // 3. Delete user_fragments
    if (keepCountryIds.length > 0) {
      const { count } = await supabaseAdmin
        .from("user_fragments")
        .delete({ count: "exact" })
        .eq("user_id", user_id)
        .not("country_id", "in", `(${keepCountryIds.join(",")})`);
      deleted.user_fragments = count || 0;
    } else {
      const { count } = await supabaseAdmin
        .from("user_fragments")
        .delete({ count: "exact" })
        .eq("user_id", user_id);
      deleted.user_fragments = count || 0;
    }

    // 4. Delete user_tokens
    if (keepCountryCodes.length > 0) {
      const { count } = await supabaseAdmin
        .from("user_tokens")
        .delete({ count: "exact" })
        .eq("user_id", user_id)
        .not("country_code", "in", `(${keepCountryCodes.join(",")})`);
      deleted.user_tokens = count || 0;
    } else {
      const { count } = await supabaseAdmin
        .from("user_tokens")
        .delete({ count: "exact" })
        .eq("user_id", user_id);
      deleted.user_tokens = count || 0;
    }

    // 5. Delete user_progress
    if (keepCountryIds.length > 0) {
      const { count } = await supabaseAdmin
        .from("user_progress")
        .delete({ count: "exact" })
        .eq("user_id", user_id)
        .not("country_id", "in", `(${keepCountryIds.join(",")})`);
      deleted.user_progress = count || 0;
    } else {
      const { count } = await supabaseAdmin
        .from("user_progress")
        .delete({ count: "exact" })
        .eq("user_id", user_id);
      deleted.user_progress = count || 0;
    }

    // 6. Reset profile (XP, level, streak) — full reset or recalculate
    if (keepSeasons.length === 0) {
      // Full reset
      await supabaseAdmin
        .from("profiles")
        .update({ xp: 0, level: 1, streak: 0, longest_streak: 0, has_completed_puzzle: false })
        .eq("user_id", user_id);
      deleted.profile_reset = 1;
    } else {
      // Partial: recalculate XP from remaining progress
      const { data: remainingProgress } = await supabaseAdmin
        .from("player_country_progress")
        .select("best_score")
        .eq("user_id", user_id);
      const totalXp = (remainingProgress || []).reduce((sum: number, p: any) => sum + (p.best_score || 0) * 10, 0);
      const newLevel = Math.max(1, Math.floor(totalXp / 100) + 1);
      await supabaseAdmin
        .from("profiles")
        .update({ xp: totalXp, level: newLevel, streak: 0, longest_streak: 0, has_completed_puzzle: false })
        .eq("user_id", user_id);
      deleted.profile_recalculated = 1;
    }

    // 7. Reset user_story_state
    if (keepSeasons.length === 0) {
      await supabaseAdmin
        .from("user_story_state")
        .delete()
        .eq("user_id", user_id);
      deleted.user_story_state = 1;
    }

    // 8. Delete user_badges
    if (keepSeasons.length === 0) {
      const { count } = await supabaseAdmin
        .from("user_badges")
        .delete({ count: "exact" })
        .eq("user_id", user_id);
      deleted.user_badges = count || 0;
    }

    // 9. Delete puzzle_pieces
    if (keepCountryIds.length > 0) {
      const { count } = await supabaseAdmin
        .from("puzzle_pieces")
        .delete({ count: "exact" })
        .eq("user_id", user_id)
        .not("country_id", "in", `(${keepCountryIds.join(",")})`);
      deleted.puzzle_pieces = count || 0;
    } else {
      const { count } = await supabaseAdmin
        .from("puzzle_pieces")
        .delete({ count: "exact" })
        .eq("user_id", user_id);
      deleted.puzzle_pieces = count || 0;
    }

    return new Response(JSON.stringify({ success: true, deleted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

