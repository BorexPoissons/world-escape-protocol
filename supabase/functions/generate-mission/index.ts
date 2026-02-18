import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Country codes with static content (loaded from public JSON files via CDN)
// These are served as static assets from the project's public folder
const STATIC_CONTENT_CODES = ["CH", "JP", "EG", "ES", "GR", "IT", "BR", "US", "IN", "MA", "RU", "CN", "FR"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { country, player_level, trust_level, suspicion_level, secrets_unlocked, base_url } = await req.json();

    // ── 1. Try static JSON content first (for the 3 free countries) ──────────
    if (STATIC_CONTENT_CODES.includes(country.code)) {
      // base_url is the origin passed from the frontend (e.g. https://myapp.lovable.app)
      const origin = base_url || "https://hatjwbwmnfkvgimfxsnx.supabase.co";
      
      try {
        // We fetch the static JSON from the same domain as the frontend
        // The client should pass its window.location.origin as base_url
        const staticUrl = `${origin}/content/countries/${country.code}.json`;
        const staticRes = await fetch(staticUrl);
        
        if (staticRes.ok) {
          const staticData = await staticRes.json();
          console.log(`Loaded static content for ${country.code}`);
          return new Response(JSON.stringify(staticData), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (staticErr) {
        console.warn(`Could not load static content for ${country.code}:`, staticErr);
        // Fall through to AI generation
      }
    }

    // ── 2. AI generation for other countries ─────────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Tu es un maître du jeu d'escape game narratif. Tu crées des missions immersives basées sur de vrais pays, leur histoire et culture.

RÈGLES:
- Crée une mission unique, captivante et culturellement authentique
- Les énigmes doivent être variées (logique, code, observation, culture)
- Adapte la difficulté au niveau du joueur (1-10)
- Intègre les variables narratives (confiance, suspicion) dans l'histoire
- Le fragment final doit faire avancer une intrigue mondiale mystérieuse
- Utilise des faits historiques RÉELS du pays

Tu DOIS répondre UNIQUEMENT en JSON valide, sans texte avant ou après.`;

    const userPrompt = `Génère une mission pour le pays suivant:
Pays: ${country.name}
Monuments: ${country.monuments?.join(', ')}
Événements historiques: ${country.historical_events?.join(', ')}
Symboles: ${country.symbols?.join(', ')}
Difficulté de base: ${country.difficulty_base}
Niveau du joueur: ${player_level}
Niveau de confiance: ${trust_level}
Niveau de suspicion: ${suspicion_level}
Secrets débloqués: ${secrets_unlocked}

Réponds en JSON avec cette structure exacte:
{
  "mission_title": "titre captivant",
  "intro": "introduction immersive de 200-400 mots",
  "enigmes": [
    {
      "question": "énoncé de l'énigme",
      "type": "logique | code | observation | culture",
      "choices": ["choix A", "choix B", "choix C", "choix D"],
      "answer": "la bonne réponse exacte parmi les choix"
    }
  ],
  "false_hint": "un faux indice trompeur",
  "moral_choice": {
    "description": "description du dilemme",
    "option_a": "premier choix",
    "option_b": "deuxième choix",
    "impact_a": { "trust": 5, "suspicion": -3 },
    "impact_b": { "trust": -3, "suspicion": 5 }
  },
  "final_fragment": "fragment narratif révélant une pièce du puzzle mondial",
  "next_hint": "indice cryptique de 1-2 phrases faisant le lien avec le prochain pays ou la prochaine étape de l'intrigue mondiale",
  "historical_fact": "fait historique réel et fascinant du pays"
}

Génère exactement 4 énigmes de difficulté progressive.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let missionData;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      missionData = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse mission JSON:", content);
      throw new Error("Failed to generate valid mission data");
    }

    return new Response(JSON.stringify(missionData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-mission error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
