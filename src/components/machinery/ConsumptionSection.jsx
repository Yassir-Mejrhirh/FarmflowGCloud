import { Droplet } from 'lucide-react';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';

export default function ConsumptionSection({ title, empty, lines, tone = 'clay' }) {
  const amountClass = tone === 'sage' ? 'text-sage' : 'text-clay';

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <Droplet className="h-3.5 w-3.5" />
        {title}
      </h3>
      {lines.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
          {lines.map((line) => (
            <li key={line.key} className="flex flex-wrap items-start gap-3 px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{line.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtDate(line.date)}</p>
              </div>
              <div className="text-end">
                <p className={`text-sm tabular-nums ${amountClass}`}>
                  {fmtNum(line.quantity, 1)} {line.unit}
                </p>
                <p className="text-[11px] tabular-nums text-muted-foreground">{fmtMoney(line.cost)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}