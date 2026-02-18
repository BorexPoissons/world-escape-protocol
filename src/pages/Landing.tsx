import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Globe, Key, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Hero Section */}
      <div className="relative min-h-screen flex flex-col items-center justify-center">
        {/* Background */}
        <div className="absolute inset-0">
          <img src={heroBg} alt="World map" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        </div>

        {/* Scanline effect */}
        <div className="absolute inset-0 scanline pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <span className="classified-stamp text-sm">CLASSIFIÉ — NIVEAU OMEGA</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl font-display font-bold text-foreground mb-4 tracking-tight"
          >
            WORLD ESCAPE
            <br />
            <span className="text-primary text-glow">PROTOCOL</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-body"
          >
            Une conspiration mondiale. 195 pays. Des énigmes générées par IA.
            Chaque mission vous rapproche de la vérité.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/dashboard">
              <Button size="lg" className="text-lg px-8 py-6 font-display tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 border-glow">
                COMMENCER LA MISSION
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 font-display tracking-wider border-border text-muted-foreground hover:text-foreground hover:border-primary/50">
                S'IDENTIFIER
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="absolute bottom-12 left-0 right-0 px-4"
        >
          <div className="max-w-4xl mx-auto flex justify-center gap-8 md:gap-16">
            {[
              { icon: Globe, label: "Pays disponibles", value: "195" },
              { icon: Key, label: "Énigmes uniques", value: "∞" },
              { icon: Shield, label: "Missions IA", value: "Dynamiques" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <stat.icon className="h-6 w-6 text-primary mx-auto mb-2 animate-pulse-gold" />
                <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground tracking-wider uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Landing;
