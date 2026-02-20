import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Mission from "./pages/Mission";
import FreeMission from "./pages/FreeMission";
import MissionComplete from "./pages/MissionComplete";
import Puzzle from "./pages/Puzzle";
import Admin from "./pages/Admin";
import CentralDilemma from "./pages/CentralDilemma";
import Leaderboard from "./pages/Leaderboard";
import Season1Unlock from "./pages/Season1Unlock";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/mission/:countryId" element={<Mission />} />
            <Route path="/free-mission/:countryId" element={<FreeMission />} />
            <Route path="/mission/:countryId/complete" element={<MissionComplete />} />
            <Route path="/puzzle" element={<Puzzle />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/dilemme-central" element={<CentralDilemma />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/season1" element={<Season1Unlock />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

