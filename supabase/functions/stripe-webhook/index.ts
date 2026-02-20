import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Which entitlement keys to grant per purchase tier
const TIER_ENTITLEMENTS: Record<string, string[]> = {
  season_1: ["season_1"],
  season_2: ["season_2"],
  season_3: ["season_3"],
  season_4: ["season_4"],
  full_bundle: ["season_1", "season_2", "season_3", "season_4"],
  // Legacy support
  agent: ["season_1"],
  director: ["season_1", "season_2", "season_3", "season_4"],
};

// Best subscription_type based on all active entitlements
function computeSubscriptionType(entitlementKeys: string[]): string {
  if (entitlementKeys.includes("season_4") || entitlementKeys.length >= 4) return "full_bundle";
  if (entitlementKeys.includes("season_3")) return "season_3";
  if (entitlementKeys.includes("season_2")) return "season_2";
  if (entitlementKeys.includes("season_1")) return "season_1";
  return "free";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    let event: Stripe.Event;

    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const tier = session.metadata?.tier || "season_1";
      const stripeCustomerId = session.customer as string;
      const stripeSessionId = session.id;

      if (!userId) {
        throw new Error("No user_id in session metadata");
      }

      // ── Anti-abuse: check if this session was already processed ──
      const { data: existingPurchase } = await supabaseAdmin
        .from("purchases")
        .select("id, user_id")
        .eq("stripe_session_id", stripeSessionId)
        .limit(1);

      if (existingPurchase && existingPurchase.length > 0) {
        if (existingPurchase[0].user_id !== userId) {
          await supabaseAdmin.from("security_logs").insert({
            event_type: "duplicate_session_different_user",
            user_id: userId,
            stripe_session_id: stripeSessionId,
            stripe_customer_id: stripeCustomerId,
            details: {
              original_user_id: existingPurchase[0].user_id,
              attempted_user_id: userId,
              tier,
            },
          });
          return new Response(JSON.stringify({ error: "Session already processed" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 409,
          });
        }
        return new Response(JSON.stringify({ received: true, note: "already_processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // ── Anti-abuse: stripe_customer_id bound to another user ──
      if (stripeCustomerId) {
        const { data: existingCustomerPurchases } = await supabaseAdmin
          .from("purchases")
          .select("user_id")
          .eq("stripe_customer_id", stripeCustomerId)
          .neq("user_id", userId)
          .limit(1);

        if (existingCustomerPurchases && existingCustomerPurchases.length > 0) {
          await supabaseAdmin.from("security_logs").insert({
            event_type: "customer_id_bound_to_other_user",
            user_id: userId,
            stripe_session_id: stripeSessionId,
            stripe_customer_id: stripeCustomerId,
            details: {
              bound_user_id: existingCustomerPurchases[0].user_id,
              attempted_user_id: userId,
              tier,
            },
          });
          return new Response(JSON.stringify({ error: "Payment bound to another account" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403,
          });
        }
      }

      // 1. Insert purchase record
      const { data: purchaseData } = await supabaseAdmin.from("purchases").insert({
        user_id: userId,
        stripe_session_id: stripeSessionId,
        stripe_customer_id: stripeCustomerId,
        stripe_payment_intent_id: session.payment_intent as string,
        tier,
        amount: session.amount_total || 2900,
        currency: session.currency || "chf",
        status: "completed",
      }).select("id").single();

      // 2. Create entitlements based on tier
      const entitlementKeys = TIER_ENTITLEMENTS[tier] || ["season_1"];
      for (const key of entitlementKeys) {
        await supabaseAdmin.from("entitlements").upsert({
          user_id: userId,
          entitlement_key: key,
          active: true,
          source_purchase_id: purchaseData?.id || null,
        }, { onConflict: "user_id,entitlement_key" });
      }

      // 3. Get all active entitlements to compute best subscription_type
      const { data: allEntitlements } = await supabaseAdmin
        .from("entitlements")
        .select("entitlement_key")
        .eq("user_id", userId)
        .eq("active", true);

      const activeKeys = (allEntitlements || []).map((e: any) => e.entitlement_key);
      const subscriptionType = computeSubscriptionType(activeKeys);

      // 4. Update profile
      await supabaseAdmin
        .from("profiles")
        .update({
          season_1_unlocked: activeKeys.includes("season_1"),
          subscription_type: subscriptionType,
        })
        .eq("user_id", userId);

      // 5. Log successful purchase
      await supabaseAdmin.from("security_logs").insert({
        event_type: "purchase_completed",
        user_id: userId,
        stripe_session_id: stripeSessionId,
        stripe_customer_id: stripeCustomerId,
        details: { tier, amount: session.amount_total, currency: session.currency, entitlements: entitlementKeys },
      });

      console.log(`✅ Purchase + entitlements created for user ${userId}, tier: ${tier}, keys: ${entitlementKeys.join(",")}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
