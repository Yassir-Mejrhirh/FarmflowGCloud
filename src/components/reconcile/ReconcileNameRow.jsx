import { useMemo } from 'react';
import SelectField from '@/components/SelectField';
import WorkerName from '@/components/WorkerName';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const TONES = {
  exact: 'bg-primary/10 text-primary',
  likely: 'bg-sage/20 text-sage',
  review: 'bg-clay/15 text-clay',
  none: 'bg-destructive/10 text-destructive',
};

// Un nom lu dans le classeur : sa proposition, son score et le choix retenu.
export default function ReconcileNameRow({ entry, proposal, value, onChange, workers = [], duplicate = false }) {
  const { t } = useI18n();
  const level = proposal?.best?.level || 'none';

  // Les propositions passent devant, le reste de la liste suit par ordre alphabétique.
  const options = useMemo(() => {
    const scored = (proposal?.alternatives || []).map((item) => ({
      value: item.worker.id,
      label: `${item.worker.name} · ${Math.round(item.score * 100)}%`,
    }));
    const seen = new Set(scored.map((option) => option.value));
    (workers || []).forEach((worker) => {
      if (seen.has(worker.id)) return;
      scored.push({ value: worker.id, label: worker.name });
    });
    return scored;
  }, [proposal, workers]);

  return (
    <article
      className={cn(
        'rounded-xl border bg-background p-3',
        value ? 'border-primary/40' : 'border-border/60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium leading-snug">
            <WorkerName name={entry.name} />
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
            <span className="tabular-nums">{t('rec.daysCount', { days: fmtNum(entry.total, 1) })}</span>
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                entry.team ? 'bg-secondary text-secondary-foreground' : 'bg-clay/10 text-clay',
              )}
            >
              {entry.team || t('rec.noTeamRead')}
            </span>
            {duplicate && (
              <span className="rounded-full bg-clay/15 px-1.5 py-0.5 text-[10px] font-medium text-clay">
                {t('rec.duplicate')}
              </span>
            )}
          </p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', TONES[level])}>
          {t(`rec.badge${level.charAt(0).toUpperCase()}${level.slice(1)}`)}
        </span>
      </div>

      <div className="mt-2">
        <SelectField
          value={value}
          onChange={(next) => onChange(entry.name, next)}
          options={options}
          noneLabel={t('rec.ignore')}
        />
      </div>
    </article>
  );
}