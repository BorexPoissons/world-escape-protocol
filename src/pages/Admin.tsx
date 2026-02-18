import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield, Users, Globe, Target, Plus, Trash2, Save, ArrowLeft,
  Home, BarChart3, Search, Eye, EyeOff, Star, FileJson, CheckCircle, XCircle,
  TrendingUp, Flame, Lock,
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
};

const STATIC_CONTENT_CODES = ["CH", "JP", "EG"];

type CountryRow = Tables<"countries"> & {
  release_order?: number;
  phase?: number;
  is_secret?: boolean;
  visibility_level?: number;
};

function getTierLabel(order: number): { label: string; color: string } {
  if (order <= 3) return { label: "FREE", color: "hsl(40 80% 55%)" };
  if (order <= 50) return { label: "AGENT", color: "hsl(220 80% 65%)" };
  return { label: "DIRECTOR", color: "hsl(280 60% 65%)" };
}

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "countries" | "users" | "missions">("overview");

  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [profiles, setProfiles] = useState<Tables<"profiles">[]>([]);
  const [missions, setMissions] = useState<Tables<"missions">[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});

  const [missionFilter, setMissionFilter] = useState<"all" | "completed" | "incomplete">("all");
  const [missionSearch, setMissionSearch] = useState("");
  const [countrySearch, setCountrySearch] = useState("");

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
    const [c, p, m, roles] = await Promise.all([
      supabase.from("countries").select("*").order("release_order"),
      supabase.from("profiles").select("*").order("xp", { ascending: false }),
      supabase.from("missions").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("user_roles").select("*"),
    ]);
    if (c.data) setCountries(c.data as CountryRow[]);
    if (p.data) setProfiles(p.data);
    if (m.data) setMissions(m.data);
    if (roles.data) {
      const map: Record<string, string> = {};
      roles.data.forEach(r => { map[r.user_id] = r.role; });
      setUserRoles(map);
    }
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

  const freeCountries = countries.filter(c => (c.release_order ?? 999) <= 3);
  const agentCountries = countries.filter(c => { const o = c.release_order ?? 999; return o > 3 && o <= 50; });
  const directorCountries = countries.filter(c => (c.release_order ?? 999) > 50);

  const filteredMissions = missions.filter(m => {
    if (missionFilter === "completed" && !m.completed) return false;
    if (missionFilter === "incomplete" && m.completed) return false;
    if (missionSearch && !m.mission_title.toLowerCase().includes(missionSearch.toLowerCase())) return false;
    return true;
  });

  const filteredCountries = countries.filter(c =>
    !countrySearch || c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const tabs = [
    { key: "overview" as const, label: "APERÇU", icon: BarChart3 },
    { key: "countries" as const, label: "PAYS", icon: Globe, count: countries.length },
    { key: "users" as const, label: "AGENTS", icon: Users, count: profiles.length },
    { key: "missions" as const, label: "MISSIONS", icon: Target, count: missions.length },
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
              {t.label}{"count" in t ? ` (${t.count})` : ""}
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW ═══════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* KPI grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "MISSIONS JOUÉES", value: missions.length, icon: Target, sub: `${completedMissions.length} complétées` },
                { label: "TAUX COMPLÉTION", value: `${completionRate}%`, icon: TrendingUp, sub: `${completedMissions.length}/${missions.length}` },
                { label: "SCORE MOYEN", value: `${avgScore}/4`, icon: Star, sub: "sur toutes les missions" },
                { label: "AGENTS ACTIFS", value: profiles.length, icon: Users, sub: "comptes enregistrés" },
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
                { label: "TIER FREE", count: freeCountries.length, color: "hsl(40 80% 55%)", icon: "🔓", desc: "Pays 1–3 · Accès gratuit" },
                { label: "TIER AGENT", count: agentCountries.length, color: "hsl(220 80% 65%)", icon: "🕵️", desc: "Pays 4–50 · 19.90 CHF" },
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
                      <span className="text-xs text-muted-foreground font-display flex-shrink-0">{m.score ?? 0}/4</span>
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
                    <span className="text-xs font-display tracking-widest px-2" style={{ color: "hsl(40 80% 55%)" }}>— TIER FREE (1–3) —</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  {freeCountries.filter(c => !countrySearch || c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch.toUpperCase())).map(c => (
                    <CountryAdminRow key={c.id} country={c} expanded={expandedCountry === c.id} onToggle={() => setExpandedCountry(expandedCountry === c.id ? null : c.id)} onEdit={() => editCountry(c)} onDelete={() => handleDeleteCountry(c.id)} />
                  ))}
                </div>
              )}

              {/* Other countries */}
              {filteredCountries.filter(c => (c.release_order ?? 999) > 3).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 my-2 px-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs font-display tracking-widest px-2 text-muted-foreground">— AGENT / DIRECTOR —</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  {filteredCountries.filter(c => (c.release_order ?? 999) > 3).map(c => (
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
            {profiles.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-display text-foreground tracking-wider">{p.display_name || "Sans nom"}</span>
                    {userRoles[p.user_id] && (
                      <span className={`text-xs font-display px-2 py-0.5 rounded border ${userRoles[p.user_id] === "admin" ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border"}`}>
                        {userRoles[p.user_id].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-display">
                    <span>Niveau {p.level}</span>
                    <span>{p.xp} XP</span>
                    <span>Série: {p.streak}</span>
                    <span className="hidden sm:inline">{(p as any).subscription_type?.toUpperCase() || "FREE"}</span>
                    <span className="hidden md:inline text-xs">{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
                <select
                  value={userRoles[p.user_id] || "user"}
                  onChange={(e) => handleRoleChange(p.user_id, e.target.value as "admin" | "moderator" | "user")}
                  className="text-xs bg-secondary border border-border rounded px-2 py-1.5 text-foreground font-display flex-shrink-0"
                >
                  <option value="user">USER</option>
                  <option value="moderator">MODERATOR</option>
                  <option value="admin">ADMIN</option>
                </select>
              </div>
            ))}
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
              <div className="flex gap-2">
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
              </div>
            </div>

            <div className="space-y-2">
              {filteredMissions.map((m) => (
                <div key={m.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {m.completed
                      ? <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      : <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                    <div className="min-w-0">
                      <span className="font-display text-foreground tracking-wider truncate block text-sm">{m.mission_title}</span>
                      <span className="text-xs text-muted-foreground">{m.score ?? 0}/4 · {new Date(m.created_at).toLocaleDateString("fr-FR")}</span>
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
              📍 {country.latitude}°N, {country.longitude}°E
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default Admin;
