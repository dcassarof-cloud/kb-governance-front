type ConsisaBrandProps = {
  collapsed?: boolean;
};

export function ConsisaBrand({ collapsed = false }: ConsisaBrandProps) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <img
        src="/consisa-symbol.png"
        alt="Consisa Sistemas"
        className="h-6 w-auto shrink-0"
      />
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <span className="block text-sm font-semibold text-sidebar-foreground truncate">
            Consisa
          </span>
          <span className="block text-[0.65rem] uppercase tracking-[0.2em] text-sidebar-foreground/70 truncate">
            KB Governance
          </span>
        </div>
      )}
    </div>
  );
}
