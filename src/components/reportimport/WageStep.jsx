import { useI18n } from '@/lib/I18nContext';
import { fmtMoney, fmtNum } from '@/lib/format';
import SelectField from '@/components/SelectField';
import StatusBadge from '@/components/reportimport/StatusBadge';

export default function WageStep({ analysis, choices, workers, onChange }) {
  const { t } = useI18n();
  const candidates = choices.rateCandidates || new Map();

  const rows = analysis.wages.map((row) => {
    const list = candidates.get(row.rate) || [];
    const value = choices.wageChoices[row.rate] || '';
    const options = (list.length ? list : workers).map((worker) => ({
      value: worker.id,
      label: worker.team ? `${worker.name} · ${worker.team}` : worker.name,
    }));
    const tone = value ? 'ok' : list.length > 1 ? 'warn' : 'error';
    const label = value
      ? t('rimp.wage.auto')
      : list.length > 1
        ? t('rimp.wage.ambiguous')
        : t('rimp.wage.absent');
    return { row, list, value, options, tone, label };
  });

  const auto = rows.filter((entry) => entry.value).length;
  const absent = rows.filter((entry) => !entry.value && !entry.list.length).length;
  const manual = rows.length - auto - absent;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl tracking-tight">{t('rimp.wage.title')}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t('rimp.wage.description')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge tone="ok">{auto} · {t('rimp.wage.auto')}</StatusBadge>
        <StatusBadge tone="warn">{manual} · {t('rimp.wage.ambiguous')}</StatusBadge>
        <StatusBadge tone="error">{absent} · {t('rimp.wage.absent')}</StatusBadge>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="hidden grid-cols-[140px_110px_1fr_150px] gap-3 border-b border-border/60 bg-secondary/60 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:grid">
          <span>{t('rimp.wage.rate')}</span>
          <span className="text-end">{t('rimp.wage.days')}</span>
          <span>{t('rimp.wage.worker')}</span>
          <span className="text-end">{t('rimp.match.title')}</span>
        </div>
        <ul className="divide-y divide-border/50">
          {rows.map(({ row, value, options, tone, label }) => (
            <li
              key={row.rate}
              className="grid gap-2 px-4 py-3 sm:grid-cols-[140px_110px_1fr_150px] sm:items-center sm:gap-3"
            >
              <span className="font-display text-lg leading-none tabular-nums">{fmtMoney(row.rate)}</span>
              <span className="text-xs tabular-nums text-muted-foreground sm:text-end">
                {fmtNum(row.days, 2)}
              </span>
              <SelectField
                value={value}
                onChange={(next) => onChange('wageChoices', row.rate, next)}
                options={options}
                placeholder={t('rimp.wage.worker')}
                noneLabel={t('rimp.wage.none')}
                className="h-9"
              />
              <div className="sm:flex sm:justify-end">
                <StatusBadge tone={tone}>{label}</StatusBadge>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('rimp.wage.summary', { auto, manual, absent })}
      </p>
    </div>
  );
}