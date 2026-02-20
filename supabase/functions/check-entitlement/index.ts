import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const userId = userData.user.id;

    // Parse requested entitlement key from body or query
    let entitlementKey = "season_1";
    try {
      const body = await req.json();
      if (body?.entitlement_key) entitlementKey = body.entitlement_key;
    } catch {
      // default to season_1
    }

    // Server-side entitlement check — cannot be spoofed
    const { data: entitlement } = await supabaseAdmin
      .from("entitlements")
      .select("active, entitlement_key, source_purchase_id, created_at")
      .eq("user_id", userId)
      .eq("entitlement_key", entitlementKey)
      .eq("active", true)
      .single();

    if (!entitlement) {
      return new Response(JSON.stringify({ entitled: false, key: entitlementKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify purchase still exists and is valid
    let purchaseValid = true;
    if (entitlement.source_purchase_id) {
      const { data: purchase } = await supabaseAdmin
        .from("purchases")
        .select("status, user_id")
        .eq("id", entitlement.source_purchase_id)
        .single();

      if (!purchase || purchase.status !== "completed" || purchase.user_id !== userId) {
        purchaseValid = false;
        // Log potential tampering
        await supabaseAdmin.from("security_logs").insert({
          event_type: "entitlement_purchase_mismatch",
          user_id: userId,
          details: {
            entitlement_key: entitlementKey,
            source_purchase_id: entitlement.source_purchase_id,
            purchase_status: purchase?.status,
            purchase_user: purchase?.user_id,
          },
        });
      }
    }

    return new Response(JSON.stringify({
      entitled: purchaseValid,
      key: entitlementKey,
      since: entitlement.created_at,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, entitled: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }
});
