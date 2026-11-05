import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FarmGroupHeader({ label, meta, collapsed, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-start transition-colors hover:bg-muted/70"
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            collapsed && '-rotate-90',
          )}
        />
        <span className="truncate text-sm font-medium">{label}</span>
      </span>
      <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {meta}
      </span>
    </button>
  );
}