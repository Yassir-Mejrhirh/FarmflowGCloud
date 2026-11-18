import { cn } from '@/lib/utils';

export default function SiteChips({ sites, value, onChange }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {sites.map((site) => {
        const active = site.id === value;
        return (
          <button
            key={site.id}
            type="button"
            onClick={() => onChange(site.id)}
            className={cn(
              'shrink-0 rounded-2xl border px-3 py-2 text-left transition-colors duration-200',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground hover:border-primary/40',
            )}
          >
            <span className="block text-[12.5px] font-medium leading-tight">{site.name}</span>
            <span
              className={cn(
                'mt-0.5 block text-[10px] uppercase tracking-[0.14em]',
                active ? 'text-primary-foreground/70' : 'text-muted-foreground',
              )}
            >
              {site.code} · {site.area}
            </span>
          </button>
        );
      })}
    </div>
  );
}