import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Image, Search, Loader2, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

const IMAGE_SLOTS = ["image_intro", "image_scene", "image_completion"] as const;
type SlotKey = typeof IMAGE_SLOTS[number];

const SLOT_LABELS: Record<SlotKey, string> = {
  image_intro: "INTRO",
  image_scene: "SCÈNE",
  image_completion: "COMPLÉTION",
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface CountryMission {
  code: string;
  country: string;
  season: number;
  content: any;
}

const FLAG_EMOJI: Record<string, string> = {
  CH: "🇨🇭", GR: "🇬🇷", IN: "🇮🇳", MA: "🇲🇦", IT: "🇮🇹", JP: "🇯🇵",
  MX: "🇲🇽", PE: "🇵🇪", TR: "🇹🇷", ET: "🇪🇹", KH: "🇰🇭", DE: "🇩🇪",
  US: "🇺🇸", CA: "🇨🇦", BR: "🇧🇷", AR: "🇦🇷", ES: "🇪🇸", PT: "🇵🇹",
  GB: "🇬🇧", NL: "🇳🇱", SE: "🇸🇪", PL: "🇵🇱", RO: "🇷🇴", IL: "🇮🇱",
  CN: "🇨🇳", KR: "🇰🇷", SG: "🇸🇬", AU: "🇦🇺", NZ: "🇳🇿", ZA: "🇿🇦",
  EG: "🇪🇬", AE: "🇦🇪", TH: "🇹🇭", VN: "🇻🇳", ID: "🇮🇩", CL: "🇨🇱",
  NO: "🇳🇴", FI: "🇫🇮", CZ: "🇨🇿", HU: "🇭🇺", QA: "🇶🇦", SA: "🇸🇦",
  KZ: "🇰🇿", MN: "🇲🇳", PH: "🇵🇭", MY: "🇲🇾", BE: "🇧🇪", FR: "🇫🇷",
};

function getSeasonColor(s: number) {
  if (s === 1) return "hsl(220 80% 65%)";
  if (s === 2) return "hsl(160 60% 52%)";
  if (s === 3) return "hsl(280 65% 62%)";
  if (s === 4) return "hsl(0 70% 58%)";
  return "hsl(40 80% 55%)";
}

export default function AdminImages() {
  const { toast } = useToast();
  const [missions, setMissions] = useState<CountryMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState<string | null>(null); // "CODE_slot"
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ code: string; slot: SlotKey } | null>(null);

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    const { data } = await supabase
      .from("countries_missions")
      .select("code, country, season, content")
      .order("season")
      .order("code");
    if (data) setMissions(data as CountryMission[]);
    setLoading(false);
  };

  const getImageUrl = (code: string, slot: SlotKey): string | null => {
    const mission = missions.find(m => m.code === code);
    const slots = mission?.content?.ui?.image_slots;
    return slots?.[slot] || null;
  };

  const getStorageUrl = (path: string) =>
    `${SUPABASE_URL}/storage/v1/object/public/mission-images/${path}`;

  const handleUploadClick = (code: string, slot: SlotKey) => {
    setUploadTarget({ code, slot });
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    const { code, slot } = uploadTarget;
    const key = `${code}_${slot}`;
    setUploading(key);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${code.toLowerCase()}/${slot}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("mission-images")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const publicUrl = getStorageUrl(path);

      // Update countries_missions content JSON
      const mission = missions.find(m => m.code === code);
      if (mission) {
        const updatedContent = { ...mission.content };
        if (!updatedContent.ui) updatedContent.ui = {};
        if (!updatedContent.ui.image_slots) updatedContent.ui.image_slots = {};
        updatedContent.ui.image_slots[slot] = publicUrl;

        const { error: updateError } = await (supabase as any)
          .from("countries_missions")
          .update({ content: updatedContent })
          .eq("code", code);

        if (updateError) throw updateError;
      }

      toast({ title: `✓ Image uploadée`, description: `${code} · ${SLOT_LABELS[slot]}` });
      await loadMissions();
    } catch (err: any) {
      toast({ title: "Erreur upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async (code: string, slot: SlotKey) => {
    const mission = missions.find(m => m.code === code);
    if (!mission) return;

    // Remove from content JSON
    const updatedContent = { ...mission.content };
    if (updatedContent.ui?.image_slots?.[slot]) {
      // Try to delete from storage
      const url = updatedContent.ui.image_slots[slot];
      const pathMatch = url?.match(/mission-images\/(.+)$/);
      if (pathMatch) {
        await supabase.storage.from("mission-images").remove([pathMatch[1]]);
      }
      updatedContent.ui.image_slots[slot] = null;

      await (supabase as any)
        .from("countries_missions")
        .update({ content: updatedContent })
        .eq("code", code);

      toast({ title: "Image supprimée", description: `${code} · ${SLOT_LABELS[slot]}` });
      await loadMissions();
    }
  };

  const filteredMissions = missions.filter(m =>
    !search ||
    m.code.toLowerCase().includes(search.toLowerCase()) ||
    m.country.toLowerCase().includes(search.toLowerCase())
  );

  // Group by season
  const bySeason: Record<number, CountryMission[]> = {};
  filteredMissions.forEach(m => {
    if (!bySeason[m.season]) bySeason[m.season] = [];
    bySeason[m.season].push(m);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const filledCount = missions.reduce((acc, m) => {
    const slots = m.content?.ui?.image_slots;
    if (!slots) return acc;
    return acc + IMAGE_SLOTS.filter(s => !!slots[s]).length;
  }, 0);
  const totalSlots = missions.length * IMAGE_SLOTS.length;

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Stats + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground tracking-wider flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" /> IMAGES DES MISSIONS
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {filledCount}/{totalSlots} slots remplis · {missions.length} pays
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un pays..."
            className="pl-9 text-xs font-display"
          />
        </div>
      </div>

      {/* By season */}
      {Object.entries(bySeason)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([season, items]) => (
          <div key={season} className="space-y-3">
            <h3
              className="font-display text-sm font-bold tracking-wider px-3 py-1.5 rounded-lg inline-block"
              style={{ backgroundColor: `${getSeasonColor(Number(season))}20`, color: getSeasonColor(Number(season)) }}
            >
              SAISON {season} · {items.length} PAYS
            </h3>

            <div className="grid gap-4">
              {items.map(m => {
                const slots = m.content?.ui?.image_slots || {};
                const filled = IMAGE_SLOTS.filter(s => !!slots[s]).length;

                return (
                  <motion.div
                    key={m.code}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{FLAG_EMOJI[m.code] || "🏳️"}</span>
                        <span className="font-display font-bold text-foreground tracking-wider text-sm">
                          {m.code}
                        </span>
                        <span className="text-xs text-muted-foreground">{m.country}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {filled === IMAGE_SLOTS.length ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-[10px] font-display text-muted-foreground">
                            {filled}/{IMAGE_SLOTS.length}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {IMAGE_SLOTS.map(slot => {
                        const url = slots[slot];
                        const isUploading = uploading === `${m.code}_${slot}`;

                        return (
                          <div key={slot} className="space-y-1.5">
                            <p className="text-[10px] font-display text-muted-foreground tracking-wider">
                              {SLOT_LABELS[slot]}
                            </p>
                            {url ? (
                              <div className="relative group">
                                <img
                                  src={url}
                                  alt={`${m.code} ${slot}`}
                                  className="w-full h-28 object-cover rounded-lg border border-border"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                                  }}
                                />
                                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-[10px] h-7 px-2 font-display"
                                    onClick={() => handleUploadClick(m.code, slot)}
                                  >
                                    <Upload className="h-3 w-3 mr-1" /> Remplacer
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="text-[10px] h-7 px-2 font-display"
                                    onClick={() => handleDeleteImage(m.code, slot)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleUploadClick(m.code, slot)}
                                disabled={isUploading}
                                className="w-full h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                              >
                                {isUploading ? (
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                  <>
                                    <Upload className="h-5 w-5" />
                                    <span className="text-[10px] font-display tracking-wider">UPLOADER</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

      {filteredMissions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground font-display text-sm tracking-wider">
          Aucun pays trouvé
        </div>
      )}
    </div>
  );
}
