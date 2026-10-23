import { cn } from '@/lib/utils';

export default function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            value === option.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}