import { Bell, User } from 'lucide-react';
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

export function Topbar() {
  const user = authService.getUser();
  const location = useLocation();

  const pageTitle = (() => {
    const pathname = location.pathname;
    if (pathname === '/dashboard') return governanceTexts.navigation.routes.dashboard;
    if (pathname.startsWith('/articles')) return governanceTexts.navigation.routes.articles;
    if (pathname.startsWith('/governance')) return governanceTexts.navigation.routes.governance;
    if (pathname.startsWith('/needs')) return governanceTexts.navigation.routes.needs;
    if (pathname.startsWith('/responsibles') || pathname.startsWith('/responsaveis')) return governanceTexts.navigation.routes.responsibles;
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
      {/* Title (sem logo para não duplicar marca) */}
      <div className="flex min-w-0 flex-col">
        <span className="text-xs text-muted-foreground">{governanceTexts.navigation.appTitle}</span>
        <span className="text-lg font-semibold text-foreground truncate">{pageTitle}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" aria-label={governanceTexts.navigation.topbar.notifications}>
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
        </Button>

        {/* User Menu */}
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
            <DropdownMenuItem>{governanceTexts.navigation.topbar.profile}</DropdownMenuItem>
            <DropdownMenuItem>{governanceTexts.navigation.topbar.preferences}</DropdownMenuItem>
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
