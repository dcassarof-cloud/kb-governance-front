import { useTheme } from '@/context/ThemeContext';
import { BRAND, BrandTheme } from '@/config/brand';

type ConsisaBrandProps = {
  collapsed?: boolean;
};

export function ConsisaBrand({ collapsed = false }: ConsisaBrandProps) {
  const { theme } = useTheme();
  const currentTheme = (theme ?? 'dark') as BrandTheme;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <img
        src={BRAND.symbols[currentTheme]}
        alt={BRAND.appName}
        className="h-6 w-auto shrink-0"
      />

      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <span className="block text-sm font-semibold text-sidebar-foreground truncate">
            {BRAND.appName}
          </span>
          {BRAND.moduleName && (
            <span className="block text-[0.65rem] uppercase tracking-[0.2em] text-sidebar-foreground/70 truncate">
              {BRAND.moduleName}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
