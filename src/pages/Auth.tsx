import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, Mail, User, Home, Radio } from "lucide-react";
import { JasperAuthModal, useJasperAuthModalAutoOpen } from "@/components/JasperAuthModal";
import { isDisplayNameForbidden } from "@/lib/forbiddenNames";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { open: jasperOpen, close: jasperClose, setOpen: setJasperOpen } = useJasperAuthModalAutoOpen();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        navigate("/dashboard");
      } else {
        if (isDisplayNameForbidden(displayName)) {
          toast({
            title: "Nom de code réservé",
            description: "Ce nom de code est déjà attribué à un agent actif. Choisissez un autre identifiant.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        await signUp(email, password, displayName);
        toast({
          title: "Inscription réussie",
          description: "Vérifiez votre email pour confirmer votre compte.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid flex items-center justify-center px-4">
      {/* Home button */}
      <div className="fixed top-4 left-4 z-50">
        <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
          <Home className="h-4 w-4" />
          <span className="text-xs font-display tracking-wider">ACCUEIL</span>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-lg p-8 border-glow">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold text-primary text-glow tracking-wider">
              {isLogin ? "IDENTIFICATION" : "RECRUTEMENT"}
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              {isLogin ? "Accédez à votre dossier agent" : "Rejoignez le protocole"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Nom de code"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email sécurisé"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "TRANSMISSION EN COURS..." : isLogin ? "S'IDENTIFIER" : "S'ENREGISTRER"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Pas encore recruté ? S'enregistrer" : "Déjà agent ? S'identifier"}
            </button>
          </div>

        </div>

        {/* Jasper message button */}
        <div className="fixed bottom-5 right-5 z-40">
          <button
            onClick={() => setJasperOpen(true)}
            className="flex items-center gap-2 rounded-md border border-border bg-card/80 backdrop-blur-sm px-4 py-2 text-xs font-display tracking-wider text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
          >
            <Radio className="h-3 w-3" />
            MESSAGE DE JASPER
          </button>
        </div>

        <JasperAuthModal open={jasperOpen} onClose={jasperClose} />
      </motion.div>
    </div>
  );
};

export default Auth;
