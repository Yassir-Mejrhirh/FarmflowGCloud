import { useState } from 'react';
import { Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import WorkerName from '@/components/WorkerName';
import { fmtMoney } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

// Ouvriers d'une équipe sans transport : le transporteur, le mode et le tarif de
// l'équipe sont proposés, chaque ligne peut être écartée avant l'affectation.
export default function ReconcileTransportGaps({ gaps = [], onApply, applying = false }) {
  const { t } = useI18n();
  const [ignored, setIgnored] = useState(() => new Set());

  if (!gaps.length) return null;
  const selected = gaps.filter((gap) => !ignored.has(gap.worker.id));

  const toggle = (id) =>
    setIgnored((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg leading-tight tracking-tight">{t('rec.transportTitle')}</h2>
        <span className="rounded-full bg-clay/15 px-2 py-0.5 text-[10.5px] tabular-nums text-clay">
          {t('rec.transportCount', { n: gaps.length })}
        </span>
      </div>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{t('rec.transportHint')}</p>

      <div className="mt-3 space-y-1.5">
        {gaps.map(({ worker, team, proposed }) => (
          <article
            key={worker.id}
            className={
              ignored.has(worker.id)
                ? 'flex items-start gap-3 rounded-xl border border-border/60 bg-background px-3 py-2'
                : 'flex items-start gap-3 rounded-xl border border-clay/30 bg-clay/5 px-3 py-2'
            }
          >
            <Checkbox
              className="mt-0.5"
              checked={!ignored.has(worker.id)}
              onCheckedChange={() => toggle(worker.id)}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-snug">
                <WorkerName name={worker.name} />
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  {team}
                </span>
                <span className="tabular-nums">
                  {proposed.transporter || t('lab.unknownTransporter')} ·{' '}
                  {proposed.mode === 'per_person' ? t('lab.modePerPerson') : t('lab.modeFixed')} ·{' '}
                  {fmtMoney(proposed.rate)} / {t('lab.perDay')}
                </span>
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          className="rounded-xl"
          onClick={() => onApply(selected)}
          disabled={applying || !selected.length}
        >
          <Truck className="h-3.5 w-3.5" />
          {applying ? t('rec.transportApplying') : t('rec.transportApply', { n: selected.length })}
        </Button>
      </div>
    </section>
  );
}