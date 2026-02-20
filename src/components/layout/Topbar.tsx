import { useMemo } from 'react';
import { Bell, User, Info, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authService } from '@/services/auth.service';
import { governanceTexts } from '@/governanceTexts';
import { API_ENDPOINTS } from '@/config/app-config';
import { apiClient } from '@/services/api-client.service';

const hasNotificationsEndpoint = 'NOTIFICATIONS' in API_ENDPOINTS;

type NotificationItem = {
  id: string;
  title: string;
};

async function fetchNotifications(): Promise<NotificationItem[]> {
  if (!hasNotificationsEndpoint) {
    return [];
  }

  const endpoint = (API_ENDPOINTS as Record<string, string>).NOTIFICATIONS;
  const response = await apiClient.get<unknown>(endpoint);
  if (!Array.isArray(response)) {
    return [];
  }

  return response
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const obj = item as Record<string, unknown>;
      if (!obj.id || !obj.title) return null;
      return { id: String(obj.id), title: String(obj.title) };
    })
    .filter((item): item is NotificationItem => Boolean(item));
}

export function Topbar() {
  const user = authService.getUser();
  const location = useLocation();

  const notificationsQuery = useQuery({
    queryKey: ['topbar-notifications'],
    queryFn: fetchNotifications,
    enabled: hasNotificationsEndpoint,
    retry: false,
  });

  const notificationsCount = useMemo(() => {
    if (!hasNotificationsEndpoint) return 0;
    return notificationsQuery.data?.length ?? 0;
  }, [notificationsQuery.data]);

  const pageTitle = (() => {
    const pathname = location.pathname;
    if (pathname === '/dashboard') return governanceTexts.navigation.routes.dashboard;
    if (pathname.startsWith('/governance')) return governanceTexts.navigation.routes.governance;
    if (pathname.startsWith('/needs')) return governanceTexts.navigation.routes.needs;
    if (pathname.startsWith('/responsibles') || pathname.startsWith('/responsaveis')) return governanceTexts.navigation.routes.responsibles;
    if (pathname.startsWith('/workload')) return governanceTexts.navigation.routes.workload;
    if (pathname.startsWith('/sync')) return governanceTexts.navigation.routes.sync;
    if (pathname.startsWith('/settings')) return governanceTexts.navigation.routes.settings;
    return governanceTexts.navigation.routes.dashboard;
  })();

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = '/login';
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex min-w-0 flex-col">
        <span className="text-xs text-muted-foreground">{governanceTexts.navigation.appTitle}</span>
        <span className="text-lg font-semibold text-foreground truncate">{pageTitle}</span>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label={governanceTexts.navigation.topbar.notifications}>
              <Bell className="h-5 w-5" />
              {hasNotificationsEndpoint && notificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <DropdownMenuLabel>{governanceTexts.navigation.topbar.notifications}</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {!hasNotificationsEndpoint ? (
              <div className="rounded-md border p-3 text-sm text-muted-foreground flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5" />
                Funcionalidade em implementação
              </div>
            ) : notificationsQuery.isLoading ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">Carregando notificações...</div>
            ) : notificationsQuery.error ? (
              <div className="space-y-2 px-1 py-2">
                <div className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Erro ao carregar notificações
                </div>
                <Button size="sm" variant="outline" onClick={() => void notificationsQuery.refetch()}>
                  Recarregar
                </Button>
              </div>
            ) : (notificationsQuery.data?.length ?? 0) === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">Nenhuma notificação</div>
            ) : (
              <div className="max-h-80 overflow-auto">
                {notificationsQuery.data?.map((item) => (
                  <DropdownMenuItem key={item.id}>{item.title}</DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2" aria-label={governanceTexts.navigation.topbar.userMenu}>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="hidden md:block text-sm font-medium">
                {user?.name || governanceTexts.navigation.topbar.defaultUser}
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{user?.name}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              {governanceTexts.navigation.topbar.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
