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
import ProtectedRoute from "./components/ProtectedRoute";

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
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/mission/:countryId" element={<ProtectedRoute><Mission /></ProtectedRoute>} />
            <Route path="/free-mission/:countryId" element={<ProtectedRoute><FreeMission /></ProtectedRoute>} />
            <Route path="/mission/:countryId/complete" element={<ProtectedRoute><MissionComplete /></ProtectedRoute>} />
            <Route path="/puzzle" element={<ProtectedRoute><Puzzle /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/dilemme-central" element={<ProtectedRoute><CentralDilemma /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/season1" element={<ProtectedRoute><Season1Unlock /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

