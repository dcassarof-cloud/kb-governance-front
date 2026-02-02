import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import ArticlesPage from "./pages/Articles";
import GovernancePage from "./pages/Governance";
import DuplicatesPage from "./pages/Duplicates";
import ReportsPage from "./pages/Reports";
import SystemsPage from "./pages/Systems";
import SyncPage from "./pages/Sync";
import SettingsPage from "./pages/Settings";
import ResponsiblesPage from "./pages/Responsibles";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./context/ThemeContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/governance" element={<GovernancePage />} />
            <Route path="/governanca" element={<GovernancePage />} />
            <Route path="/responsibles" element={<ResponsiblesPage />} />
            <Route path="/responsaveis" element={<ResponsiblesPage />} />
            <Route path="/duplicates" element={<DuplicatesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/systems" element={<SystemsPage />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
