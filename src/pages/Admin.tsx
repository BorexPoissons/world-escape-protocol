import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Users, Globe, Target, Plus, Trash2, Save, ArrowLeft, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"countries" | "users" | "missions">("countries");

  // Data
  const [countries, setCountries] = useState<Tables<"countries">[]>([]);
  const [profiles, setProfiles] = useState<Tables<"profiles">[]>([]);
  const [missions, setMissions] = useState<Tables<"missions">[]>([]);

  // Country form
  const [countryForm, setCountryForm] = useState({
    name: "", code: "", description: "", difficulty_base: 1,
    monuments: "", historical_events: "", symbols: "",
    latitude: "", longitude: "",
  });
  const [editingCountryId, setEditingCountryId] = useState<string | null>(null);

  useEffect(() => {
    // Auth check disabled for demo — re-enable in production
    // if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user!.id)
      .eq("role", "admin")
      .maybeSingle();

    if (data) {
      setIsAdmin(true);
      fetchAllData();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    const [c, p, m] = await Promise.all([
      supabase.from("countries").select("*").order("difficulty_base"),
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("missions").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (c.data) setCountries(c.data);
    if (p.data) setProfiles(p.data);
    if (m.data) setMissions(m.data);
    setLoading(false);
  };

  const handleSaveCountry = async () => {
    const payload = {
      name: countryForm.name,
      code: countryForm.code,
      description: countryForm.description || null,
      difficulty_base: countryForm.difficulty_base,
      monuments: countryForm.monuments ? countryForm.monuments.split(",").map(s => s.trim()) : [],
      historical_events: countryForm.historical_events ? countryForm.historical_events.split(",").map(s => s.trim()) : [],
      symbols: countryForm.symbols ? countryForm.symbols.split(",").map(s => s.trim()) : [],
      latitude: countryForm.latitude ? parseFloat(countryForm.latitude) : null,
      longitude: countryForm.longitude ? parseFloat(countryForm.longitude) : null,
    };

    let error;
    if (editingCountryId) {
      ({ error } = await supabase.from("countries").update(payload).eq("id", editingCountryId));
    } else {
      ({ error } = await supabase.from("countries").insert(payload));
    }

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingCountryId ? "Pays mis à jour" : "Pays ajouté" });
      resetCountryForm();
      fetchAllData();
    }
  };

  const handleDeleteCountry = async (id: string) => {
    const { error } = await supabase.from("countries").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pays supprimé" });
      fetchAllData();
    }
  };

  const editCountry = (c: Tables<"countries">) => {
    setEditingCountryId(c.id);
    setCountryForm({
      name: c.name,
      code: c.code,
      description: c.description || "",
      difficulty_base: c.difficulty_base,
      monuments: (c.monuments || []).join(", "),
      historical_events: (c.historical_events || []).join(", "),
      symbols: (c.symbols || []).join(", "),
      latitude: c.latitude?.toString() || "",
      longitude: c.longitude?.toString() || "",
    });
  };

  const resetCountryForm = () => {
    setEditingCountryId(null);
    setCountryForm({ name: "", code: "", description: "", difficulty_base: 1, monuments: "", historical_events: "", symbols: "", latitude: "", longitude: "" });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary font-display animate-pulse-gold text-xl tracking-widest">VÉRIFICATION ACCÈS...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-xl text-foreground tracking-widest mb-2">ACCÈS REFUSÉ</h1>
          <p className="text-muted-foreground mb-4">Vous n'avez pas les droits administrateur.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "countries" as const, label: "PAYS", icon: Globe, count: countries.length },
    { key: "users" as const, label: "UTILISATEURS", icon: Users, count: profiles.length },
    { key: "missions" as const, label: "MISSIONS", icon: Target, count: missions.length },
  ];

  return (
    <div className="min-h-screen bg-background bg-grid">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors mr-2">
              <Home className="h-4 w-4" />
              <span className="text-xs font-display tracking-wider hidden sm:inline">ACCUEIL</span>
            </Link>
            <span className="text-border mr-2">|</span>
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-display text-lg font-bold text-primary tracking-wider">ADMIN · W.E.P.</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground font-display tracking-wider">
            <ArrowLeft className="h-4 w-4 mr-2" /> DASHBOARD
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-display text-sm tracking-wider transition-all ${
                activeTab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Countries Tab */}
        {activeTab === "countries" && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-display text-foreground tracking-wider mb-4">
                {editingCountryId ? "MODIFIER UN PAYS" : "AJOUTER UN PAYS"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input placeholder="Nom du pays" value={countryForm.name} onChange={(e) => setCountryForm(f => ({ ...f, name: e.target.value }))} />
                <Input placeholder="Code (ex: FR)" value={countryForm.code} onChange={(e) => setCountryForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                <Input placeholder="Difficulté (1-5)" type="number" min={1} max={5} value={countryForm.difficulty_base} onChange={(e) => setCountryForm(f => ({ ...f, difficulty_base: parseInt(e.target.value) || 1 }))} />
                <Input placeholder="Description" value={countryForm.description} onChange={(e) => setCountryForm(f => ({ ...f, description: e.target.value }))} className="md:col-span-2 lg:col-span-3" />
                <Input placeholder="Monuments (séparés par des virgules)" value={countryForm.monuments} onChange={(e) => setCountryForm(f => ({ ...f, monuments: e.target.value }))} />
                <Input placeholder="Événements historiques (virgules)" value={countryForm.historical_events} onChange={(e) => setCountryForm(f => ({ ...f, historical_events: e.target.value }))} />
                <Input placeholder="Symboles (virgules)" value={countryForm.symbols} onChange={(e) => setCountryForm(f => ({ ...f, symbols: e.target.value }))} />
                <Input placeholder="Latitude" value={countryForm.latitude} onChange={(e) => setCountryForm(f => ({ ...f, latitude: e.target.value }))} />
                <Input placeholder="Longitude" value={countryForm.longitude} onChange={(e) => setCountryForm(f => ({ ...f, longitude: e.target.value }))} />
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSaveCountry}>
                  {editingCountryId ? <Save className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {editingCountryId ? "Sauvegarder" : "Ajouter"}
                </Button>
                {editingCountryId && (
                  <Button variant="ghost" onClick={resetCountryForm}>Annuler</Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {countries.map((c) => (
                <div key={c.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <span className="font-display text-foreground tracking-wider">{c.name.toUpperCase()}</span>
                    <span className="text-muted-foreground text-sm ml-3">({c.code})</span>
                    <span className="text-muted-foreground text-sm ml-3">Difficulté: {"★".repeat(c.difficulty_base)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => editCountry(c)} className="text-primary">Modifier</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCountry(c.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-2">
            {profiles.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="font-display text-foreground tracking-wider">{p.display_name || "Sans nom"}</span>
                  <span className="text-muted-foreground text-sm ml-3">Niveau {p.level} · {p.xp} XP</span>
                </div>
                <span className="text-xs text-muted-foreground font-display">
                  {new Date(p.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
            ))}
            {profiles.length === 0 && (
              <p className="text-center text-muted-foreground py-10 font-display tracking-wider">AUCUN UTILISATEUR</p>
            )}
          </div>
        )}

        {/* Missions Tab */}
        {activeTab === "missions" && (
          <div className="space-y-2">
            {missions.map((m) => (
              <div key={m.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="font-display text-foreground tracking-wider">{m.mission_title}</span>
                  <span className={`text-sm ml-3 ${m.completed ? "text-primary" : "text-muted-foreground"}`}>
                    {m.completed ? "✓ Complétée" : "En cours"}
                  </span>
                  {m.score !== null && <span className="text-muted-foreground text-sm ml-3">Score: {m.score}</span>}
                </div>
                <span className="text-xs text-muted-foreground font-display">
                  {new Date(m.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
            ))}
            {missions.length === 0 && (
              <p className="text-center text-muted-foreground py-10 font-display tracking-wider">AUCUNE MISSION</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
