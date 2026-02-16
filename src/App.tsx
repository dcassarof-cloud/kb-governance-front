import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import ArticlesPage from "./pages/Articles";
import GovernancePage from "./pages/Governance";
import GovernanceIssueDetailPage from "./pages/GovernanceIssueDetail";
import NeedsPage from "./pages/Needs";
import SyncPage from "./pages/Sync";
import SettingsPage from "./pages/Settings";
import ResponsiblesPage from "./pages/Responsibles";
import WorkloadPage from "./pages/Workload";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./context/ThemeContext";
import { authService, hasRole } from "./services/auth.service";

const queryClient = new QueryClient();

/**
 * Guard de rota com autenticação + RBAC no frontend.
 *
 * Sem sessão: envia para login.
 * Sem role necessária: volta para dashboard.
 */
const RequireRole = ({ roles, children }: { roles: string[]; children: JSX.Element }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (!hasRole(roles)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

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
            <Route path="/governance/issues/:id" element={<GovernanceIssueDetailPage />} />
            <Route path="/governanca" element={<GovernancePage />} />
            <Route path="/needs" element={<NeedsPage />} />
            <Route path="/needs/:id" element={<NeedsPage />} />
            <Route path="/responsibles" element={<ResponsiblesPage />} />
            <Route path="/responsaveis" element={<ResponsiblesPage />} />
            <Route
              path="/workload"
              element={
                <RequireRole roles={['ADMIN', 'MANAGER']}>
                  <WorkloadPage />
                </RequireRole>
              }
            />
            <Route
              path="/sync"
              element={
                <RequireRole roles={['ADMIN', 'MANAGER']}>
                  <SyncPage />
                </RequireRole>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireRole roles={['ADMIN']}>
                  <SettingsPage />
                </RequireRole>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
