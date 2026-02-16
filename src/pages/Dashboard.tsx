import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Globe, LogOut, Shield, Star, Map } from "lucide-react";
import CountryCard from "@/components/CountryCard";
import type { Tables } from "@/integrations/supabase/types";

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [countries, setCountries] = useState<Tables<"countries">[]>([]);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [completedCountries, setCompletedCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [countriesRes, profileRes, missionsRes] = await Promise.all([
        supabase.from("countries").select("*").order("difficulty_base"),
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("missions").select("country_id").eq("user_id", user.id).eq("completed", true),
      ]);

      if (countriesRes.data) setCountries(countriesRes.data);
      if (profileRes.data) setProfile(profileRes.data);
      if (missionsRes.data) setCompletedCountries(missionsRes.data.map(m => m.country_id));
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary font-display animate-pulse-gold text-xl tracking-widest">
          CHARGEMENT DU DOSSIER...
        </div>
      </div>
    );
  }

  const progress = countries.length > 0 ? Math.round((completedCountries.length / countries.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-display text-lg font-bold text-primary tracking-wider">W.E.P.</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-foreground font-display">Agent {profile?.display_name}</p>
              <p className="text-xs text-muted-foreground">Niveau {profile?.level} · {profile?.xp} XP</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10"
        >
          <div className="bg-card border border-border rounded-lg p-5 border-glow">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground font-display tracking-wider">PROGRESSION</span>
            </div>
            <p className="text-3xl font-display font-bold text-foreground">{progress}%</p>
            <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 border-glow">
            <div className="flex items-center gap-3 mb-2">
              <Map className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground font-display tracking-wider">PAYS COMPLÉTÉS</span>
            </div>
            <p className="text-3xl font-display font-bold text-foreground">
              {completedCountries.length}<span className="text-muted-foreground text-lg">/{countries.length}</span>
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 border-glow">
            <div className="flex items-center gap-3 mb-2">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground font-display tracking-wider">NIVEAU AGENT</span>
            </div>
            <p className="text-3xl font-display font-bold text-foreground">{profile?.level}</p>
          </div>
        </motion.div>

        {/* Countries */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-display font-bold text-foreground tracking-wider mb-6">
            SÉLECTIONNER UN PAYS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {countries.map((country, i) => (
              <motion.div
                key={country.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <CountryCard
                  country={country}
                  completed={completedCountries.includes(country.id)}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
