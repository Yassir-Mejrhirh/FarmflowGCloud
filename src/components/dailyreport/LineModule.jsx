import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// A big entry module of a line (labour, machinery): it opens for the entry and
// folds back once the line is pre-validated.
export default function LineModule({ icon: Icon, title, count = 0, hint, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('rounded-xl border transition-colors', open ? 'border-primary/40' : 'border-border/70')}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-start"
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} />}
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">{count ? count : hint}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="space-y-2 border-t border-border/60 p-3">{children}</div>}
    </div>
  );
}