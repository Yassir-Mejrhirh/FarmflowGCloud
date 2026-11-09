import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const KEY = 'farmflow.loadtest.isolation.v1';

export default function IsolationChecklist({ items }) {
  const [done, setDone] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(KEY) || '[]');
      if (Array.isArray(stored)) setDone(stored);
    } catch {
      setDone([]);
    }
  }, []);

  const toggle = (index) => {
    const next = done.includes(index) ? done.filter((value) => value !== index) : [...done, index];
    setDone(next);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-1.5">
        {items.map((item, index) => {
          const checked = done.includes(index);
          return (
            <li key={item}>
              <button
                type="button"
                onClick={() => toggle(index)}
                className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-start transition-colors hover:bg-secondary/50"
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors',
                    checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card',
                  )}
                >
                  {checked && <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}
                </span>
                <span
                  className={cn(
                    'text-sm leading-relaxed',
                    checked ? 'text-muted-foreground line-through decoration-border' : '',
                  )}
                >
                  {item}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-border/60 px-2 pt-3">
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {done.length} / {items.length} vérifiés
        </p>
        {done.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg px-2 text-[11px] text-muted-foreground"
            onClick={() => {
              setDone([]);
              window.localStorage.removeItem(KEY);
            }}
          >
            Réinitialiser
          </Button>
        )}
      </div>
    </div>
  );
}