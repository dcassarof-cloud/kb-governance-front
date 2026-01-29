type ConsisaLogoProps = {
  size?: number;
  showText?: boolean;
};

export function ConsisaLogo({ size = 30, showText = true }: ConsisaLogoProps) {
  const logoHeight = { height: size };
  const symbolSize = { height: size, width: size };

  return (
    <div className="flex items-center gap-3 min-w-0">
      {showText ? (
        <>
          <img
            src="/consisa-logo.png"
            alt="Consisa Sistemas"
            className="block dark:hidden shrink-0"
            style={logoHeight}
          />
          <img
            src="/consisa-logo-white.png"
            alt="Consisa Sistemas"
            className="hidden dark:block shrink-0"
            style={logoHeight}
          />
        </>
      ) : (
        <>
          <img
            src="/consisa-symbol.png"
            alt="Consisa Sistemas"
            className="block dark:hidden shrink-0"
            style={symbolSize}
          />
          <img
            src="/consisa-symbol-white.png"
            alt="Consisa Sistemas"
            className="hidden dark:block shrink-0"
            style={symbolSize}
          />
        </>
      )}
      {showText && (
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-sidebar-foreground/80 truncate">
          KB Governance
        </span>
      )}
    </div>
  );
}
