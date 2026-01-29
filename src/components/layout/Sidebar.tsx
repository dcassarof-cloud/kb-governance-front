import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Shield,
  Copy,
  BarChart3,
  Server,
  RefreshCw,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';
import { ConsisaBrand } from '@/components/brand/ConsisaBrand';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/articles', label: 'Manuais', icon: FileText },
  { path: '/governance', label: 'Governança', icon: Shield },
  { path: '/duplicates', label: 'Duplicados', icon: Copy },
  { path: '/reports', label: 'Relatórios', icon: BarChart3 },
  { path: '/systems', label: 'Sistemas', icon: Server },
  { path: '/sync', label: 'Sincronização', icon: RefreshCw },
  { path: '/settings', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = '/login';
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <NavLink
          to="/dashboard"
          className={cn(
            'flex flex-1 items-center gap-3 min-w-0 transition-all',
            collapsed ? 'justify-center' : 'animate-slide-in-left'
          )}
          aria-label="Consisa Sistemas - KB Governance"
          title={collapsed ? 'Consisa Sistemas' : undefined}
        >
          <ConsisaBrand collapsed={collapsed} />
        </NavLink>

        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:bg-sidebar-accent ml-auto"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn('sidebar-item', isActive && 'sidebar-item-active')}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className={cn('sidebar-item w-full text-sidebar-foreground/70 hover:text-sidebar-foreground')}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
