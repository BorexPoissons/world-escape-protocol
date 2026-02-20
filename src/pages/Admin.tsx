import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield, Users, Globe, Target, Plus, Trash2, Save, ArrowLeft,
  Home, BarChart3, Search, Eye, EyeOff, Star, FileJson, CheckCircle, XCircle,
  TrendingUp, Flame, Lock, CreditCard, Upload, Filter, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { motion } from "framer-motion";

const FLAG_EMOJI: Record<string, string> = {
  CH: "🇨🇭", JP: "🇯🇵", EG: "🇪🇬", FR: "🇫🇷", DE: "🇩🇪",
  IT: "🇮🇹", ES: "🇪🇸", GB: "🇬🇧", BR: "🇧🇷", US: "🇺🇸",
  CA: "🇨🇦", AU: "🇦🇺", CN: "🇨🇳", IN: "🇮🇳", MX: "🇲🇽",
  MA: "🇲🇦", TR: "🇹🇷", AR: "🇦🇷", KR: "🇰🇷", GR: "🇬🇷",
  RU: "🇷🇺",
};

const STATIC_CONTENT_CODES = ["CH", "JP", "EG", "US", "BR", "CN", "IN", "MA", "ES", "IT", "FR", "GR", "RU"];
const FREE_THRESHOLD = 5; // pays 1–5 sont FREE (CH, BR, CN, US, IN)

type CountryRow = Tables<"countries"> & {
  release_order?: number;
  phase?: number;
  is_secret?: boolean;
  visibility_level?: number;
};

function getTierLabel(order: number): { label: string; color: string } {
  if (order <= FREE_THRESHOLD) return { label: "FREE", color: "hsl(40 80% 55%)" };
  if (order <= 50) return { label: "AGENT", color: "hsl(220 80% 65%)" };
  return { label: "DIRECTOR", color: "hsl(280 60% 65%)" };
}

function getSubscriptionBadge(type: string) {
  if (type === "director") return { label: "DIRECTOR", color: "hsl(280 60% 65%)" };
  if (type === "agent" || type === "season1") return { label: "AGENT", color: "hsl(220 80% 65%)" };
  return { label: "FREE", color: "hsl(40 80% 55%)" };
}

type ParsedQuestion = {
  id: string;
  type: string;
  question: string;
  choices: string[];
  answer_index: number;
  narrative_unlock?: string;
};

type JsonImportPreview = {
  code: string;
  name?: string;
  description?: string;
  monuments?: string[];
  historical_events?: string[];
  symbols?: string[];
  questionCount?: number;
  missionTitle?: string;
  parsedQuestions?: ParsedQuestion[];
  // Story fields extracted for preview
  storyFields?: {
    mission_title?: string;
    cold_open?: string;
    intro?: string;
    objective?: string;
    stakes?: string;
    location_context?: string;
    jasper_quote?: string;
    next_hook?: string;
    next_country_code?: string;
    token_letter?: string;
  };
} | null;

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "countries" | "users" | "missions" | "purchases">("overview");

  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [profiles, setProfiles] = useState<Tables<"profiles">[]>([]);
  const [missions, setMissions] = useState<Tables<"missions">[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});

  // Missions tab state
  const [missionFilter, setMissionFilter] = useState<"all" | "completed" | "incomplete">("all");
  const [missionSearch, setMissionSearch] = useState("");
  const [missionDedup, setMissionDedup] = useState(false);

  // Countries tab state
  const [countrySearch, setCountrySearch] = useState("");
  const [jsonImportPreview, setJsonImportPreview] = useState<JsonImportPreview>(null);
  const [jsonImporting, setJsonImporting] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Purchases tab state
  const [confirmChange, setConfirmChange] = useState<{ userId: string; name: string; newType: string } | null>(null);
  const [subscriptionLogs, setSubscriptionLogs] = useState<{ userId: string; name: string; oldType: string; newType: string; at: string }[]>([]);

  // Phase data for agents tab
  const [userFragments, setUserFragments] = useState<any[]>([]);
  const [userTokens, setUserTokens] = useState<any[]>([]);
  const [playerProgress, setPlayerProgress] = useState<any[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const [countryForm, setCountryForm] = useState({
    name: "", code: "", description: "", difficulty_base: 1,
    monuments: "", historical_events: "", symbols: "",
    latitude: "", longitude: "",
    release_order: 999, phase: 1, is_secret: false, visibility_level: 1,
  });
  const [editingCountryId, setEditingCountryId] = useState<string | null>(null);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    const { data } = await supabase
      .from("user_roles").select("role")
      .eq("user_id", user!.id).eq("role", "admin").maybeSingle();
    if (data) { setIsAdmin(true); fetchAllData(); }
    else { setIsAdmin(false); setLoading(false); }
  };

  const fetchAllData = async () => {
    const [c, p, m, roles, frags, tokens, progress] = await Promise.all([
      supabase.from("countries").select("*").order("release_order"),
      supabase.from("profiles").select("*").order("xp", { ascending: false }),
      supabase.from("missions").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_roles").select("*"),
      supabase.from("user_fragments" as any).select("*"),
      supabase.from("user_tokens" as any).select("*"),
      supabase.from("player_country_progress").select("*"),
    ]);
    if (c.data) setCountries(c.data as CountryRow[]);
    if (p.data) setProfiles(p.data);
    if (m.data) setMissions(m.data);
    if (roles.data) {
      const map: Record<string, string> = {};
      roles.data.forEach(r => { map[r.user_id] = r.role; });
      setUserRoles(map);
    }
    if (frags.data) setUserFragments(frags.data);
    if (tokens.data) setUserTokens(tokens.data);
    if (progress.data) setPlayerProgress(progress.data);
    setLoading(false);
  };

  const handleSaveCountry = async () => {
    const payload: any = {
      name: countryForm.name,
      code: countryForm.code.toUpperCase(),
      description: countryForm.description || null,
      difficulty_base: countryForm.difficulty_base,
      monuments: countryForm.monuments ? countryForm.monuments.split(",").map(s => s.trim()).filter(Boolean) : [],
      historical_events: countryForm.historical_events ? countryForm.historical_events.split(",").map(s => s.trim()).filter(Boolean) : [],
      symbols: countryForm.symbols ? countryForm.symbols.split(",").map(s => s.trim()).filter(Boolean) : [],
      latitude: countryForm.latitude ? parseFloat(countryForm.latitude) : null,
      longitude: countryForm.longitude ? parseFloat(countryForm.longitude) : null,
      release_order: countryForm.release_order,
      phase: countryForm.phase,
      is_secret: countryForm.is_secret,
      visibility_level: countryForm.visibility_level,
    };

    let error;
    if (editingCountryId) {
      ({ error } = await supabase.from("countries").update(payload).eq("id", editingCountryId));
    } else {
      ({ error } = await supabase.from("countries").insert(payload));
    }

    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: editingCountryId ? "✓ Pays mis à jour" : "✓ Pays ajouté" }); resetCountryForm(); fetchAllData(); }
  };

  const handleDeleteCountry = async (id: string) => {
    const { error } = await supabase.from("countries").delete().eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Pays supprimé" }); fetchAllData(); }
  };

  const editCountry = (c: CountryRow) => {
    setEditingCountryId(c.id);
    setCountryForm({
      name: c.name, code: c.code, description: c.description || "",
      difficulty_base: c.difficulty_base,
      monuments: (c.monuments || []).join(", "),
      historical_events: (c.historical_events || []).join(", "),
      symbols: (c.symbols || []).join(", "),
      latitude: c.latitude?.toString() || "",
      longitude: c.longitude?.toString() || "",
      release_order: c.release_order ?? 999,
      phase: c.phase ?? 1,
      is_secret: c.is_secret ?? false,
      visibility_level: c.visibility_level ?? 1,
    });
    setActiveTab("countries");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetCountryForm = () => {
    setEditingCountryId(null);
    setCountryForm({
      name: "", code: "", description: "", difficulty_base: 1,
      monuments: "", historical_events: "", symbols: "", latitude: "", longitude: "",
      release_order: 999, phase: 1, is_secret: false, visibility_level: 1,
    });
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "moderator" | "user") => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    if (newRole !== "user") await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    toast({ title: "✓ Rôle mis à jour" });
    fetchAllData();
  };

  // ── JSON Import ────────────────────────────────────────────
  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);

        // Detect format: master template (has meta.code) vs legacy (has country.code)
        const isMasterTemplate = !!json.meta?.code;

        const code = (
          json.meta?.code || json.country?.code || json.code || file.name.replace(".json", "")
        ).toUpperCase();
        const name = json.meta?.country || json.country?.name || json.country?.name_fr || json.country?.name_en || json.name;
        const description = json.country?.description || json.mission?.description || json.description;
        const monuments = json.country?.monuments || json.monuments || [];
        const historical_events = json.country?.historical_events || json.historical_events || [];
        const symbols = json.country?.symbols || json.symbols || [];
        const missionTitle = json.story?.mission_title || json.mission?.mission_title || json.mission_title;

        // Parse questions from either format
        let rawQuestions: ParsedQuestion[] = [];
        if (isMasterTemplate && json.gameplay?.questions?.length > 0) {
          // Master template format: gameplay.questions[]
          rawQuestions = json.gameplay.questions.map((q: any, i: number) => {
            const choices = (q.options ?? []).map((o: any) => typeof o === "string" ? o : o.text ?? "");
            
            // Resolve correct_answer cleanly
            let correctAnswer: string;
            if (q.correct_answer) {
              correctAnswer = String(q.correct_answer);
            } else if (q.answer?.type === "option_id") {
              // Map option_id (e.g. "B") to the text of that option
              const matched = (q.options ?? []).find((o: any) => (typeof o === "string" ? false : o.id === q.answer.value));
              correctAnswer = matched ? (typeof matched === "string" ? matched : matched.text ?? String(q.answer.value)) : String(q.answer.value);
            } else if (q.answer?.type === "number") {
              correctAnswer = String(q.answer.value);
            } else if (q.answer?.value) {
              correctAnswer = String(q.answer.value);
            } else {
              correctAnswer = choices[0] ?? "A";
              console.warn(`[Admin Import] Question ${q.id ?? i}: no answer found, fallback to first choice`);
            }

            const answerIndex = choices.indexOf(correctAnswer);

            return {
              id: q.id ?? `${code}_Q${i + 1}`,
              type: q.type ?? (i < json.gameplay.questions.length - 1 ? (i === 0 ? "A" : "B") : "C"),
              question: q.prompt ?? q.question ?? "",
              choices,
              answer_index: answerIndex >= 0 ? answerIndex : 0,
              correct_answer: correctAnswer,
              narrative_unlock: q.narrative_unlock,
            };
          });
        } else {
          // Legacy format: question_bank[] or questions[]
          rawQuestions = (json.question_bank || json.questions || []);
        }
        const questionCount = rawQuestions.length;

        // Extract story fields for preview
        const storyFields = isMasterTemplate ? {
          mission_title: json.story?.mission_title,
          cold_open: json.story?.cold_open,
          intro: json.story?.intro ? (json.story.intro.substring(0, 100) + (json.story.intro.length > 100 ? "…" : "")) : undefined,
          objective: json.story?.objective,
          stakes: json.story?.stakes,
          location_context: json.story?.location_context,
          jasper_quote: json.completion?.jasper_quote,
          next_hook: json.completion?.next_hook,
          next_country_code: json.completion?.next_country_code ?? json.completion?.unlock?.next_country_code,
          token_letter: json.rewards?.token?.value,
        } : undefined;

        setJsonImportPreview({
          code, name, description, monuments, historical_events, symbols,
          questionCount, missionTitle, parsedQuestions: rawQuestions,
          storyFields,
          // Store full JSON for countries_missions upsert
          _fullJson: json,
          _isMasterTemplate: isMasterTemplate,
        } as any);
      } catch {
        toast({ title: "Erreur JSON", description: "Fichier JSON invalide", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const handleJsonImport = async () => {
    if (!jsonImportPreview) return;
    setJsonImporting(true);
    const preview = jsonImportPreview as any;
    const { code, name, description, monuments, historical_events, symbols, parsedQuestions } = preview;
    const fullJson = preview._fullJson;
    const isMasterTemplate = preview._isMasterTemplate;

    // 1. Mettre à jour les métadonnées du pays (countries table)
    const payload: any = {};
    if (name) payload.name = name;
    if (description) payload.description = description;
    if (monuments?.length) payload.monuments = monuments;
    if (historical_events?.length) payload.historical_events = historical_events;
    if (symbols?.length) payload.symbols = symbols;

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from("countries").update(payload).eq("code", code);
      if (error) {
        toast({ title: "Erreur metadata", description: error.message, variant: "destructive" });
        setJsonImporting(false);
        return;
      }
    }

    // 2. Importer les questions si présentes (questions table — legacy support)
    let questionsImported = 0;
    if (parsedQuestions && parsedQuestions.length > 0) {
      const { data: countryData } = await supabase
        .from("countries").select("id").eq("code", code).maybeSingle();

      if (countryData?.id) {
        // Remplacer toutes les questions existantes
        await supabase.from("questions").delete().eq("country_id", countryData.id);

        const difficultyMap: Record<string, number> = { A: 1, B: 2, C: 3 };
        const questionsToInsert = parsedQuestions.map((q: ParsedQuestion & { correct_answer?: string }) => ({
          country_id: countryData.id,
          question_text: q.question,
          answer_options: q.choices as any,
          correct_answer: q.correct_answer ?? q.choices[q.answer_index] ?? q.choices[0] ?? "A",
          category: q.type || "A",
          difficulty_level: difficultyMap[q.type] ?? 1,
        }));

        const { error: qError } = await supabase.from("questions").insert(questionsToInsert);
        if (qError) {
          toast({ title: "Erreur questions", description: qError.message, variant: "destructive" });
          setJsonImporting(false);
          return;
        }
        questionsImported = questionsToInsert.length;
      }
    }

    // 3. Upsert full content into countries_missions (master template)
    let contentSynced = false;
    if (isMasterTemplate && fullJson) {
      const isFree = fullJson.meta?.availability?.is_free ?? false;
      const season = fullJson.meta?.season ?? 0;
      const difficulty = fullJson.meta?.difficulty ?? 1;

      const { error: cmError } = await (supabase as any)
        .from("countries_missions")
        .upsert({
          code,
          country: fullJson.meta?.country ?? name ?? code,
          content: fullJson,
          is_free: isFree,
          season,
          difficulty,
        }, { onConflict: "code" });

      if (cmError) {
        toast({ title: "Erreur countries_missions", description: cmError.message, variant: "destructive" });
      } else {
        contentSynced = true;
      }
    }

    const parts: string[] = [];
    if (Object.keys(payload).length > 0) parts.push(`${Object.keys(payload).length} champ(s) métadonnées`);
    if (questionsImported > 0) parts.push(`${questionsImported} question(s) importée(s)`);
    if (contentSynced) {
      const storyF = preview.storyFields;
      const storyCount = storyF ? Object.values(storyF).filter(Boolean).length : 0;
      parts.push(`✓ countries_missions synchronisé (${storyCount} champ(s) narratifs)`);
    }

    toast({
      title: `✓ ${code} importé`,
      description: parts.length > 0 ? parts.join(" · ") : "Aucune donnée nouvelle dans ce JSON",
    });
    setJsonImportPreview(null);
    if (jsonInputRef.current) jsonInputRef.current.value = "";
    fetchAllData();
    setJsonImporting(false);
  };

  // ── Subscription management ────────────────────────────────
  const handleSubscriptionChange = async (userId: string, name: string, newType: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    const oldType = (profile as any)?.subscription_type || "free";

    const { error } = await supabase.from("profiles").update({ subscription_type: newType }).eq("user_id", userId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `✓ Accès mis à jour`, description: `${name} → ${newType.toUpperCase()}` });
      setSubscriptionLogs(prev => [{
        userId, name, oldType, newType,
        at: new Date().toLocaleTimeString("fr-FR"),
      }, ...prev.slice(0, 9)]);
      setConfirmChange(null);
      fetchAllData();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary font-display animate-pulse text-sm tracking-widest">VÉRIFICATION ACCÈS...</div>
      </div>
    );
  }

  if (!user) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="font-display text-xl text-foreground tracking-widest mb-4">CONNEXION REQUISE</h1>
        <Button variant="outline" onClick={() => navigate("/auth")}>Se connecter</Button>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="font-display text-xl text-foreground tracking-widest mb-2">ACCÈS REFUSÉ</h1>
        <p className="text-muted-foreground mb-4">Droits administrateur requis.</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button>
      </div>
    </div>
  );

  // ── Analytics ─────────────────────────────────────────────
  const completedMissions = missions.filter(m => m.completed);
  const avgScore = completedMissions.length > 0
    ? (completedMissions.reduce((s, m) => s + (m.score || 0), 0) / completedMissions.length).toFixed(1)
    : "0";
  const completionRate = missions.length > 0 ? Math.round((completedMissions.length / missions.length) * 100) : 0;

  // Unique missions par country_id (meilleur score)
  const uniqueMissionsByCountry: Record<string, Tables<"missions"> & { attempts: number }> = {};
  missions.forEach(m => {
    const existing = uniqueMissionsByCountry[m.country_id];
    if (!existing || (m.score || 0) > (existing.score || 0)) {
      uniqueMissionsByCountry[m.country_id] = { ...m, attempts: 0 };
    }
  });
  // Compter les tentatives par pays
  const attemptsByCountry: Record<string, number> = {};
  missions.forEach(m => { attemptsByCountry[m.country_id] = (attemptsByCountry[m.country_id] || 0) + 1; });
  const uniqueMissions = Object.values(uniqueMissionsByCountry).map(m => ({
    ...m, attempts: attemptsByCountry[m.country_id] || 1,
  }));

  const freeCountries = countries.filter(c => (c.release_order ?? 999) <= FREE_THRESHOLD);
  const agentCountries = countries.filter(c => { const o = c.release_order ?? 999; return o > FREE_THRESHOLD && o <= 50; });
  const directorCountries = countries.filter(c => (c.release_order ?? 999) > 50);

  const filteredMissions = (() => {
    const source = missionDedup ? uniqueMissions : missions;
    return source.filter(m => {
      if (missionFilter === "completed" && !m.completed) return false;
      if (missionFilter === "incomplete" && m.completed) return false;
      if (missionSearch && !m.mission_title.toLowerCase().includes(missionSearch.toLowerCase())) return false;
      return true;
    });
  })();

  const filteredCountries = countries.filter(c =>
    !countrySearch || c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Purchases analytics
  const freeUsers = profiles.filter(p => !((p as any).subscription_type) || (p as any).subscription_type === "free");
  const agentUsers = profiles.filter(p => ["agent", "season1"].includes((p as any).subscription_type || ""));
  const directorUsers = profiles.filter(p => (p as any).subscription_type === "director");

  const tabs = [
    { key: "overview" as const, label: "APERÇU", icon: BarChart3 },
    { key: "countries" as const, label: "PAYS", icon: Globe, count: countries.length },
    { key: "users" as const, label: "AGENTS", icon: Users, count: profiles.length },
    { key: "missions" as const, label: "MISSIONS", icon: Target, count: missions.length },
    { key: "purchases" as const, label: "ACHATS", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background" style={{ backgroundImage: "radial-gradient(hsl(40 80% 55% / 0.03) 1px, transparent 1px)", backgroundSize: "32px 32px" }}>
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors mr-2">
              <Home className="h-4 w-4" />
              <span className="text-xs font-display tracking-wider hidden sm:inline">ACCUEIL</span>
            </Link>
            <span className="text-border mr-2">|</span>
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="font-display text-base font-bold text-primary tracking-wider">QUARTIER GÉNÉRAL · W.E.P.</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground font-display tracking-wider text-xs">
            <ArrowLeft className="h-4 w-4 mr-2" />DASHBOARD
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-display text-xs tracking-wider transition-all flex-shrink-0 border ${
                activeTab === t.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}{"count" in t && t.count !== undefined ? ` (${t.count})` : ""}
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW ═══════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* KPI grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "TENTATIVES TOTALES", value: missions.length, icon: Target, sub: `dont ${uniqueMissions.length} pays distincts` },
                { label: "TAUX COMPLÉTION", value: `${completionRate}%`, icon: TrendingUp, sub: `${completedMissions.length}/${missions.length}` },
                { label: "SCORE MOYEN", value: `${avgScore}/6`, icon: Star, sub: "sur toutes les tentatives" },
                { label: "AGENTS ACTIFS", value: profiles.length, icon: Users, sub: `${agentUsers.length} Agent · ${directorUsers.length} Director` },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-card border border-border rounded-xl p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <card.icon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-display text-muted-foreground tracking-wider">{card.label}</span>
                  </div>
                  <p className="text-3xl font-display font-bold text-foreground">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* Tier breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "TIER FREE", count: freeCountries.length, color: "hsl(40 80% 55%)", icon: "🔓", desc: `Pays 1–${FREE_THRESHOLD} · Accès gratuit` },
                { label: "TIER AGENT", count: agentCountries.length, color: "hsl(220 80% 65%)", icon: "🕵️", desc: `Pays ${FREE_THRESHOLD + 1}–50 · 19.90 CHF` },
                { label: "TIER DIRECTOR", count: directorCountries.length, color: "hsl(280 60% 65%)", icon: "👁", desc: "Pays 51+ · 119 CHF" },
              ].map((tier) => (
                <div key={tier.label} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg">{tier.icon}</span>
                    <span className="text-xs font-display tracking-wider px-2 py-0.5 rounded"
                      style={{ color: tier.color, border: `1px solid ${tier.color}40`, background: `${tier.color}10` }}>
                      {tier.label}
                    </span>
                  </div>
                  <p className="text-3xl font-display font-bold text-foreground mb-1">{tier.count}</p>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (tier.count / 195) * 100)}%`, background: tier.color }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{tier.desc}</p>
                </div>
              ))}
            </div>

            {/* Top agents + Récentes missions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-display text-sm text-muted-foreground tracking-wider mb-4 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" />TOP AGENTS
                </h3>
                <div className="space-y-2">
                  {profiles.slice(0, 6).map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-display text-muted-foreground w-5">#{i + 1}</span>
                        <span className="text-sm font-display text-foreground">{p.display_name || "Agent"}</span>
                        {userRoles[p.user_id] === "admin" && (
                          <span className="text-xs font-display text-primary px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10">ADMIN</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-primary font-display">Niv.{p.level}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.xp} XP</span>
                      </div>
                    </div>
                  ))}
                  {profiles.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Aucun agent enregistré</p>}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-display text-sm text-muted-foreground tracking-wider mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />MISSIONS RÉCENTES
                  <span className="ml-auto text-xs text-muted-foreground font-normal normal-case">({missions.length} tentatives · {uniqueMissions.length} pays)</span>
                </h3>
                <div className="space-y-2">
                  {missions.slice(0, 6).map(m => (
                    <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        {m.completed
                          ? <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          : <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                        <span className="text-sm text-foreground truncate max-w-[160px]">{m.mission_title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-display flex-shrink-0">{m.score ?? 0}/6</span>
                    </div>
                  ))}
                  {missions.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Aucune mission</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ COUNTRIES ══════════════════════════════════════════════════ */}
        {activeTab === "countries" && (
          <div className="space-y-6">
            {/* Form */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-display text-foreground tracking-wider mb-5 flex items-center gap-2">
                {editingCountryId ? <Save className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
                {editingCountryId ? "MODIFIER LE PAYS" : "AJOUTER UN PAYS"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Input placeholder="Nom du pays *" value={countryForm.name} onChange={e => setCountryForm(f => ({ ...f, name: e.target.value }))} className="font-display text-sm" />
                <Input placeholder="Code ISO (ex: FR) *" value={countryForm.code} onChange={e => setCountryForm(f => ({ ...f, code: e.target.value.toUpperCase().slice(0, 2) }))} className="font-display text-sm" />
                <div className="flex gap-2">
                  <Input placeholder="Difficulté 1-5" type="number" min={1} max={5} value={countryForm.difficulty_base} onChange={e => setCountryForm(f => ({ ...f, difficulty_base: parseInt(e.target.value) || 1 }))} className="font-display text-sm flex-1" />
                  <Input placeholder="Ordre" type="number" value={countryForm.release_order} onChange={e => setCountryForm(f => ({ ...f, release_order: parseInt(e.target.value) || 999 }))} className="font-display text-sm flex-1" title="release_order" />
                  <Input placeholder="Phase" type="number" min={1} value={countryForm.phase} onChange={e => setCountryForm(f => ({ ...f, phase: parseInt(e.target.value) || 1 }))} className="font-display text-sm w-20" />
                </div>
                <Input placeholder="Description narrative" value={countryForm.description} onChange={e => setCountryForm(f => ({ ...f, description: e.target.value }))} className="font-display text-sm md:col-span-2 lg:col-span-3" />
                <Input placeholder="Monuments (séparés par virgules)" value={countryForm.monuments} onChange={e => setCountryForm(f => ({ ...f, monuments: e.target.value }))} className="font-display text-sm" />
                <Input placeholder="Événements historiques (virgules)" value={countryForm.historical_events} onChange={e => setCountryForm(f => ({ ...f, historical_events: e.target.value }))} className="font-display text-sm" />
                <Input placeholder="Symboles (virgules)" value={countryForm.symbols} onChange={e => setCountryForm(f => ({ ...f, symbols: e.target.value }))} className="font-display text-sm" />
                <Input placeholder="Latitude" value={countryForm.latitude} onChange={e => setCountryForm(f => ({ ...f, latitude: e.target.value }))} className="font-display text-sm" />
                <Input placeholder="Longitude" value={countryForm.longitude} onChange={e => setCountryForm(f => ({ ...f, longitude: e.target.value }))} className="font-display text-sm" />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={countryForm.is_secret}
                      onChange={e => setCountryForm(f => ({ ...f, is_secret: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-xs font-display text-muted-foreground tracking-wider">PAYS SECRET</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSaveCountry} className="font-display tracking-wider">
                  {editingCountryId ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {editingCountryId ? "SAUVEGARDER" : "AJOUTER"}
                </Button>
                {editingCountryId && (
                  <Button variant="ghost" onClick={resetCountryForm} className="font-display tracking-wider text-muted-foreground">
                    ANNULER
                  </Button>
                )}
              </div>
            </div>

            {/* JSON Import */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-display text-foreground tracking-wider mb-4 flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />IMPORTER UN JSON PAYS
              </h2>
              <p className="text-xs text-muted-foreground mb-4 font-display">
                Importez un fichier JSON mission (BR.json, IN.json...) pour mettre à jour les métadonnées du pays en base.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="cursor-pointer">
                  <input
                    ref={jsonInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleJsonFileChange}
                  />
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors text-xs font-display text-primary tracking-wider">
                    <FileJson className="h-4 w-4" />
                    CHOISIR UN FICHIER JSON
                  </div>
                </label>
                {jsonImportPreview && (
                  <Button onClick={handleJsonImport} disabled={jsonImporting} size="sm" className="font-display tracking-wider text-xs">
                    <CheckCircle className="h-3.5 w-3.5 mr-2" />
                    {jsonImporting ? "IMPORT EN COURS..." : `IMPORTER ${jsonImportPreview.code}`}
                  </Button>
                )}
              </div>

              {/* Preview */}
              {jsonImportPreview && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-secondary/40 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{FLAG_EMOJI[jsonImportPreview.code] || "🌍"}</span>
                    <span className="font-display font-bold text-foreground tracking-wider">{jsonImportPreview.code}</span>
                    {jsonImportPreview.name && <span className="text-sm text-muted-foreground">— {jsonImportPreview.name}</span>}
                    {jsonImportPreview.missionTitle && (
                      <span className="ml-auto text-xs font-display text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                        {jsonImportPreview.missionTitle}
                      </span>
                    )}
                  </div>
                  {jsonImportPreview.description && (
                    <p className="text-xs text-muted-foreground italic mb-3">"{jsonImportPreview.description}"</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-display">
                    <div>
                      <span className="text-muted-foreground tracking-wider">MONUMENTS</span>
                      <p className={`mt-0.5 ${jsonImportPreview.monuments?.length ? "text-foreground" : "text-muted-foreground/50"}`}>
                        {jsonImportPreview.monuments?.length || 0} élément(s)
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground tracking-wider">ÉVÉNEMENTS</span>
                      <p className={`mt-0.5 ${jsonImportPreview.historical_events?.length ? "text-foreground" : "text-muted-foreground/50"}`}>
                        {jsonImportPreview.historical_events?.length || 0} élément(s)
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground tracking-wider">SYMBOLES</span>
                      <p className={`mt-0.5 ${jsonImportPreview.symbols?.length ? "text-foreground" : "text-muted-foreground/50"}`}>
                        {jsonImportPreview.symbols?.length || 0} élément(s)
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground tracking-wider">QUESTIONS</span>
                      <p className={`mt-0.5 font-bold ${jsonImportPreview.questionCount ? "text-primary" : "text-muted-foreground/50"}`}>
                        {jsonImportPreview.questionCount || 0} dans le pool
                      </p>
                    </div>
                  </div>

                  {/* Story fields preview */}
                  {jsonImportPreview.storyFields && (
                    <div className="mt-3 p-3 bg-primary/5 border border-primary/15 rounded-lg space-y-2">
                      <p className="text-xs font-display tracking-widest text-primary/70">CHAMPS NARRATIFS DÉTECTÉS</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-display">
                        {([
                          ["mission_title", "TITRE MISSION"],
                          ["cold_open", "COLD OPEN"],
                          ["intro", "INTRO"],
                          ["objective", "OBJECTIF"],
                          ["stakes", "ENJEUX"],
                          ["location_context", "CONTEXTE"],
                          ["jasper_quote", "CITATION JASPER"],
                          ["next_hook", "ACCROCHE SUIVANTE"],
                          ["next_country_code", "PAYS SUIVANT"],
                          ["token_letter", "LETTRE TOKEN"],
                        ] as [string, string][]).map(([key, label]) => {
                          const val = (jsonImportPreview.storyFields as any)?.[key];
                          return (
                            <div key={key} className="flex items-center gap-1.5">
                              {val ? (
                                <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                              )}
                              <span className={val ? "text-foreground" : "text-muted-foreground/40"}>{label}</span>
                            </div>
                          );
                        })}
                      </div>
                      {jsonImportPreview.storyFields.token_letter && (
                        <p className="text-xs text-primary mt-1">
                          Lettre du token : <span className="font-bold text-sm">{jsonImportPreview.storyFields.token_letter}</span>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-display">
                    {(jsonImportPreview.questionCount || 0) > 0 && (
                      <span className="flex items-center gap-1 text-primary/80">
                        <CheckCircle className="h-3 w-3" />
                        {jsonImportPreview.questionCount} question(s) seront importées en base (remplacement complet)
                      </span>
                    )}
                    {(jsonImportPreview.monuments?.length || 0) === 0 &&
                     (jsonImportPreview.historical_events?.length || 0) === 0 &&
                     (jsonImportPreview.symbols?.length || 0) === 0 &&
                     (jsonImportPreview.questionCount || 0) === 0 && (
                      <span className="flex items-center gap-1 text-amber-500/80">
                        <AlertCircle className="h-3 w-3" />
                        Aucune donnée importable détectée dans ce JSON.
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Search + list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un pays..."
                    value={countrySearch}
                    onChange={e => setCountrySearch(e.target.value)}
                    className="pl-9 font-display text-sm"
                  />
                </div>
                <span className="text-xs font-display text-muted-foreground tracking-wider">{countries.length} PAYS</span>
              </div>

              {/* Free countries section */}
              {freeCountries.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-display tracking-widest px-2" style={{ color: "hsl(40 80% 55%)" }}>— TIER FREE (1–{FREE_THRESHOLD}) —</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  {freeCountries.filter(c => !countrySearch || c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch.toUpperCase())).map(c => (
                    <CountryAdminRow key={c.id} country={c} expanded={expandedCountry === c.id} onToggle={() => setExpandedCountry(expandedCountry === c.id ? null : c.id)} onEdit={() => editCountry(c)} onDelete={() => handleDeleteCountry(c.id)} />
                  ))}
                </div>
              )}

              {/* Other countries */}
              {filteredCountries.filter(c => (c.release_order ?? 999) > FREE_THRESHOLD).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 my-2 px-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-display tracking-widest px-2 text-muted-foreground">— AGENT / DIRECTOR —</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  {filteredCountries.filter(c => (c.release_order ?? 999) > FREE_THRESHOLD).map(c => (
                    <CountryAdminRow key={c.id} country={c} expanded={expandedCountry === c.id} onToggle={() => setExpandedCountry(expandedCountry === c.id ? null : c.id)} onEdit={() => editCountry(c)} onDelete={() => handleDeleteCountry(c.id)} />
                  ))}
                </div>
              )}

              {countries.length === 0 && (
                <p className="text-center text-muted-foreground py-10 font-display tracking-wider">AUCUN PAYS — Ajoutez votre premier pays ci-dessus</p>
              )}
            </div>
          </div>
        )}

        {/* ══ USERS ══════════════════════════════════════════════════════ */}
        {activeTab === "users" && (
          <div className="space-y-2">
            {profiles.map((p) => {
              const uid = p.user_id;
              const uFrags = userFragments.filter((f: any) => f.user_id === uid);
              const uTokens = userTokens.filter((t: any) => t.user_id === uid);
              const uProgress = playerProgress.filter((pr: any) => pr.user_id === uid);
              const placedCount = uFrags.filter((f: any) => f.is_placed).length;
              const isExpanded = expandedUser === uid;

              return (
                <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => setExpandedUser(isExpanded ? null : uid)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-display text-foreground tracking-wider">{p.display_name || "Sans nom"}</span>
                        {userRoles[uid] && (
                          <span className={`text-xs font-display px-2 py-0.5 rounded border ${userRoles[uid] === "admin" ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border"}`}>
                            {userRoles[uid].toUpperCase()}
                          </span>
                        )}
                        <span className="text-xs font-display px-1.5 py-0.5 rounded border border-border bg-secondary text-muted-foreground">
                          {((p as any).subscription_type || "free").toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-display">
                        <span>Niv.{p.level}</span>
                        <span>{p.xp} XP</span>
                        <span>Série: {p.streak}</span>
                        <span>🧩 {uFrags.length} frag ({placedCount} placés)</span>
                        <span>🔤 {uTokens.length} tokens</span>
                        <span className="hidden sm:inline">🎯 {uProgress.length} pays joués</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={userRoles[uid] || "user"}
                        onChange={(e) => { e.stopPropagation(); handleRoleChange(uid, e.target.value as any); }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-secondary border border-border rounded px-2 py-1.5 text-foreground font-display flex-shrink-0"
                      >
                        <option value="user">USER</option>
                        <option value="moderator">MODERATOR</option>
                        <option value="admin">ADMIN</option>
                      </select>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="border-t border-border bg-secondary/20 px-4 py-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-display">
                        {/* Progression pays */}
                        <div>
                          <h4 className="tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5" />PROGRESSION PAYS ({uProgress.length})
                          </h4>
                          {uProgress.length === 0 && <p className="text-muted-foreground/50">Aucun pays joué</p>}
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {uProgress.map((pr: any) => {
                              const country = countries.find(c => c.code === pr.country_code);
                              return (
                                <div key={pr.id} className="flex items-center justify-between py-1 border-b border-border/30">
                                  <span className="text-foreground">
                                    {FLAG_EMOJI[pr.country_code] || "🌍"} {country?.name || pr.country_code}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">{pr.best_score}/6</span>
                                    <span className="text-muted-foreground/60">{pr.attempts_count}×</span>
                                    {pr.fragment_granted && <span style={{ color: "hsl(40 80% 55%)" }}>🧩</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Fragments & Placement */}
                        <div>
                          <h4 className="tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                            🧩 FRAGMENTS ({uFrags.length}) · {placedCount} PLACÉS
                          </h4>
                          {uFrags.length === 0 && <p className="text-muted-foreground/50">Aucun fragment</p>}
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {uFrags.map((f: any) => {
                              const country = countries.find(c => c.id === f.country_id);
                              return (
                                <div key={f.id} className="flex items-center justify-between py-1 border-b border-border/30">
                                  <span className="text-foreground">
                                    {country ? `${FLAG_EMOJI[country.code] || "🌍"} ${country.name}` : f.country_id.slice(0, 8)}
                                  </span>
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[10px] tracking-wider"
                                    style={{
                                      color: f.is_placed ? "hsl(140 60% 50%)" : "hsl(40 80% 55%)",
                                      background: f.is_placed ? "hsl(140 60% 50% / 0.1)" : "hsl(40 80% 55% / 0.1)",
                                      border: `1px solid ${f.is_placed ? "hsl(140 60% 50% / 0.3)" : "hsl(40 80% 55% / 0.3)"}`,
                                    }}
                                  >
                                    {f.is_placed ? "PLACÉ ✓" : "EN COFFRE"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Tokens (Letters) */}
                        <div>
                          <h4 className="tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                            🔤 TOKENS ({uTokens.length})
                          </h4>
                          {uTokens.length === 0 && <p className="text-muted-foreground/50">Aucun token</p>}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {uTokens.map((t: any) => (
                              <div
                                key={t.id}
                                className="flex items-center gap-1 px-2 py-1 rounded"
                                style={{
                                  background: "hsl(40 80% 55% / 0.08)",
                                  border: "1px solid hsl(40 80% 55% / 0.25)",
                                }}
                              >
                                <span className="font-bold" style={{ color: "hsl(40 85% 62%)" }}>{t.letter}</span>
                                <span className="text-muted-foreground text-[10px]">{t.country_code}</span>
                              </div>
                            ))}
                          </div>
                          {uTokens.length >= 5 && (
                            <div className="px-2 py-1 rounded text-[10px] tracking-wider text-center"
                              style={{ color: "hsl(140 60% 55%)", background: "hsl(140 60% 55% / 0.08)", border: "1px solid hsl(140 60% 55% / 0.2)" }}>
                              SET COMPLET — LETTRES RÉVÉLÉES
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
            {profiles.length === 0 && (
              <p className="text-center text-muted-foreground py-10 font-display tracking-wider">AUCUN UTILISATEUR</p>
            )}
          </div>
        )}

        {/* ══ MISSIONS ═══════════════════════════════════════════════════ */}
        {activeTab === "missions" && (
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une mission..."
                  value={missionSearch}
                  onChange={e => setMissionSearch(e.target.value)}
                  className="pl-9 font-display text-sm"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(["all", "completed", "incomplete"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setMissionFilter(f)}
                    className={`px-3 py-2 rounded-lg font-display text-xs tracking-wider transition-all border ${
                      missionFilter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "all" ? "TOUTES" : f === "completed" ? "✓ COMPLÉTÉES" : "EN COURS"}
                  </button>
                ))}
                <button
                  onClick={() => setMissionDedup(!missionDedup)}
                  className={`px-3 py-2 rounded-lg font-display text-xs tracking-wider transition-all border flex items-center gap-1.5 ${
                    missionDedup ? "bg-amber-500/20 text-amber-400 border-amber-500/40" : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Filter className="h-3 w-3" />
                  {missionDedup ? "UNIQUE PAR PAYS ✓" : "UNIQUE PAR PAYS"}
                </button>
              </div>
            </div>

            {/* Info banner si doublons */}
            {!missionDedup && missions.length > uniqueMissions.length && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs font-display text-amber-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {missions.length} tentatives au total dont des replays — activez "UNIQUE PAR PAYS" pour voir les {uniqueMissions.length} pays joués
              </div>
            )}

            <div className="space-y-2">
              {(filteredMissions as any[]).map((m) => (
                <div key={m.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {m.completed
                      ? <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      : <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                    <div className="min-w-0">
                      <span className="font-display text-foreground tracking-wider truncate block text-sm">{m.mission_title}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{m.score ?? 0}/6</span>
                        <span>{new Date(m.created_at).toLocaleDateString("fr-FR")}</span>
                        {missionDedup && m.attempts > 1 && (
                          <span className="text-amber-400/80">{m.attempts} tentatives</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-display px-2 py-0.5 rounded flex-shrink-0 ${m.completed ? "text-primary bg-primary/10" : "text-muted-foreground bg-secondary"}`}>
                    {m.completed ? "COMPLÉTÉE" : "EN COURS"}
                  </span>
                </div>
              ))}
              {filteredMissions.length === 0 && (
                <div className="text-center py-12">
                  <Target className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground font-display tracking-wider">AUCUNE MISSION TROUVÉE</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ ACHATS ═════════════════════════════════════════════════════ */}
        {activeTab === "purchases" && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "FREE", count: freeUsers.length, color: "hsl(40 80% 55%)", icon: "🔓", desc: "Accès gratuit (5 pays)" },
                { label: "AGENT", count: agentUsers.length, color: "hsl(220 80% 65%)", icon: "🕵️", desc: "Season 1 · 19.90 CHF" },
                { label: "DIRECTOR", count: directorUsers.length, color: "hsl(280 60% 65%)", icon: "👁", desc: "Accès total · 119 CHF" },
              ].map((tier) => (
                <div key={tier.label} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{tier.icon}</span>
                    <span className="text-xs font-display tracking-wider px-2 py-0.5 rounded"
                      style={{ color: tier.color, border: `1px solid ${tier.color}40`, background: `${tier.color}10` }}>
                      {tier.label}
                    </span>
                  </div>
                  <p className="text-3xl font-display font-bold text-foreground">{tier.count}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tier.desc}</p>
                </div>
              ))}
            </div>

            {/* Log des changements récents */}
            {subscriptionLogs.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-display text-sm text-muted-foreground tracking-wider mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />MODIFICATIONS RÉCENTES
                </h3>
                <div className="space-y-1.5">
                  {subscriptionLogs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-display py-1 border-b border-border/30 last:border-0">
                      <span className="text-foreground">{log.name}</span>
                      <span className="text-muted-foreground">{log.oldType.toUpperCase()} → {log.newType.toUpperCase()}</span>
                      <span className="text-muted-foreground/60">{log.at}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Liste des utilisateurs avec gestion subscription */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-display text-sm text-muted-foreground tracking-wider mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />GESTION DES ACCÈS
              </h3>
              <div className="space-y-3">
                {profiles.map((p) => {
                  const subType = (p as any).subscription_type || "free";
                  const badge = getSubscriptionBadge(subType);
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-display text-foreground text-sm">{p.display_name || "Agent sans nom"}</span>
                          <span className="text-xs font-display px-1.5 py-0.5 rounded"
                            style={{ color: badge.color, border: `1px solid ${badge.color}30`, background: `${badge.color}10` }}>
                            {badge.label}
                          </span>
                          {userRoles[p.user_id] === "admin" && (
                            <span className="text-xs font-display text-primary px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10">ADMIN</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-display">
                          Niv.{p.level} · {p.xp} XP · Créé {new Date(p.created_at).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {["free", "agent", "director"].map((tier) => (
                          <button
                            key={tier}
                            disabled={subType === tier}
                            onClick={() => setConfirmChange({ userId: p.user_id, name: p.display_name || "Agent", newType: tier })}
                            className={`px-2.5 py-1 rounded text-xs font-display tracking-wider transition-all border ${
                              subType === tier
                                ? "opacity-40 cursor-not-allowed border-border bg-secondary text-muted-foreground"
                                : "border-border hover:border-primary/50 bg-card text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {tier === "free" ? "FREE" : tier === "agent" ? "AGENT" : "DIRECTOR"}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {profiles.length === 0 && (
                  <p className="text-center text-muted-foreground py-6 font-display tracking-wider">AUCUN UTILISATEUR</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Confirmation dialog ── */}
        {confirmChange && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-xl"
            >
              <Shield className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-display text-foreground tracking-wider text-center mb-2">CONFIRMER LE CHANGEMENT</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Passer <strong className="text-foreground">{confirmChange.name}</strong> en accès{" "}
                <strong className="text-foreground">{confirmChange.newType.toUpperCase()}</strong> ?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 font-display tracking-wider text-xs"
                  onClick={() => setConfirmChange(null)}
                >
                  ANNULER
                </Button>
                <Button
                  className="flex-1 font-display tracking-wider text-xs"
                  onClick={() => handleSubscriptionChange(confirmChange.userId, confirmChange.name, confirmChange.newType)}
                >
                  CONFIRMER
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
};

// ── Country Admin Row ──────────────────────────────────────────────────────────
interface CountryAdminRowProps {
  country: CountryRow;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const CountryAdminRow = ({ country, expanded, onToggle, onEdit, onDelete }: CountryAdminRowProps) => {
  const order = country.release_order ?? 999;
  const tier = getTierLabel(order);
  const hasStatic = STATIC_CONTENT_CODES.includes(country.code);
  const flag = FLAG_EMOJI[country.code] || "🌍";

  return (
    <motion.div
      layout
      className="bg-card border border-border rounded-xl mb-2 overflow-hidden"
    >
      {/* Row header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={onToggle}
      >
        <span className="text-2xl">{flag}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-foreground tracking-wider text-sm">{country.name.toUpperCase()}</span>
            <span className="text-xs text-muted-foreground">({country.code})</span>
            <span className="text-primary text-xs font-display">{"★".repeat(country.difficulty_base)}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs font-display px-1.5 py-0.5 rounded"
              style={{ color: tier.color, border: `1px solid ${tier.color}30`, background: `${tier.color}10` }}>
              {tier.label}
            </span>
            <span className="text-xs text-muted-foreground font-display">#{order}</span>
            {country.phase && <span className="text-xs text-muted-foreground">Phase {country.phase}</span>}
            {country.is_secret && (
              <span className="text-xs font-display px-1.5 py-0.5 rounded" style={{ color: "hsl(280 60% 65%)", border: "1px solid hsl(280 60% 65% / 0.3)", background: "hsl(280 60% 65% / 0.1)" }}>
                SECRET
              </span>
            )}
            {hasStatic ? (
              <span className="text-xs font-display flex items-center gap-1" style={{ color: "hsl(120 60% 50%)" }}>
                <FileJson className="h-3 w-3" />JSON STATIQUE
              </span>
            ) : (
              <span className="text-xs text-muted-foreground font-display flex items-center gap-1">
                <Target className="h-3 w-3" />IA DYNAMIQUE
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded text-primary hover:bg-primary/10 transition-colors" title="Modifier">
            <Save className="h-3.5 w-3.5" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded text-destructive hover:bg-destructive/10 transition-colors" title="Supprimer">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {expanded ? <EyeOff className="h-4 w-4 text-muted-foreground ml-1" /> : <Eye className="h-4 w-4 text-muted-foreground ml-1" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-border px-4 pb-4 pt-3 bg-secondary/20"
        >
          {country.description && (
            <p className="text-sm text-muted-foreground italic mb-3 leading-relaxed">"{country.description}"</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-display">
            {(country.monuments || []).length > 0 && (
              <div>
                <p className="text-muted-foreground tracking-wider mb-1">MONUMENTS</p>
                <ul className="space-y-0.5">
                  {(country.monuments || []).map((m, i) => <li key={i} className="text-foreground">· {m}</li>)}
                </ul>
              </div>
            )}
            {(country.historical_events || []).length > 0 && (
              <div>
                <p className="text-muted-foreground tracking-wider mb-1">ÉVÉNEMENTS</p>
                <ul className="space-y-0.5">
                  {(country.historical_events || []).map((e, i) => <li key={i} className="text-foreground">· {e}</li>)}
                </ul>
              </div>
            )}
            {(country.symbols || []).length > 0 && (
              <div>
                <p className="text-muted-foreground tracking-wider mb-1">SYMBOLES</p>
                <ul className="space-y-0.5">
                  {(country.symbols || []).map((s, i) => <li key={i} className="text-foreground">· {s}</li>)}
                </ul>
              </div>
            )}
          </div>
          {country.latitude && country.longitude && (
            <p className="text-xs text-muted-foreground mt-3 font-display">
              📍 {country.latitude.toFixed(4)}, {country.longitude.toFixed(4)}
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default Admin;
