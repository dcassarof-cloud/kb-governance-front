import { useTheme } from '@/context/ThemeContext';
import { BRAND, BrandTheme } from '@/config/brand';

type ConsisaLogoProps = {
  size?: number;
  showText?: boolean;
};

export function ConsisaLogo({ size = 30, showText = true }: ConsisaLogoProps) {
  const { theme } = useTheme();
  const currentTheme = (theme ?? 'dark') as BrandTheme;

  const logoHeight = { height: size };
  const symbolSize = { height: size, width: size };

  const src = showText ? BRAND.logos[currentTheme] : BRAND.symbols[currentTheme];

  return (
    <div className="flex items-center gap-3 min-w-0">
      <img
        src={src}
        alt={BRAND.appName}
        className="shrink-0"
        style={showText ? logoHeight : symbolSize}
      />

      {showText && BRAND.moduleName && (
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-sidebar-foreground/80 truncate">
          {BRAND.moduleName}
        </span>
      )}
    </div>
  );
}
