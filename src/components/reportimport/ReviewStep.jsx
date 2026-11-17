import { useI18n } from '@/lib/I18nContext';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/reportimport/StatusBadge';
import { fmtDate } from '@/lib/format';

const TONES = {
  ready: 'ok',
  duplicate: 'neutral',
  ignored: 'neutral',
  nodate: 'error',
  noblock: 'warn',
  notask: 'warn',
  nolabour: 'warn',
  empty: 'warn',
};

export default function ReviewStep({ built, writing, onIgnore, onConfirm }) {
  const { t } = useI18n();
  const { lines, summary } = built;
  const pending = lines.filter((line) => line.status !== 'ready' && line.status !== 'ignored');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl tracking-tight">{t('rimp.review.title')}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t('rimp.review.hint')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['ready', summary.ready, 'ok'],
          ['incomplete', summary.incomplete, 'warn'],
          ['duplicate', summary.duplicate, 'neutral'],
          ['ignored', summary.ignored, 'neutral'],
        ].map(([key, value, tone]) => (
          <div key={key} className="rounded-2xl border border-border/70 bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t(`rimp.review.${key}`)}
            </p>
            <p className="mt-1.5 font-display text-2xl leading-none tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <header className="border-b border-border/60 bg-secondary/50 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t('rimp.detail')} · {pending.length}
          </header>
          <ul className="max-h-[340px] divide-y divide-border/50 overflow-y-auto">
            {pending.map((line) => (
              <li key={line.key} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-[12px]">
                <span className="tabular-nums text-muted-foreground">{fmtDate(line.date)}</span>
                <span className="font-medium">{line.place}</span>
                <span className="truncate text-muted-foreground">{line.nature || '—'}</span>
                <StatusBadge tone={TONES[line.status] || 'neutral'} className="ms-auto">
                  {t(`rimp.status.${line.status}`)}
                </StatusBadge>
                <button
                  type="button"
                  onClick={() => onIgnore(line.key, line.status !== 'ignored')}
                  className="text-[11px] text-primary hover:underline"
                >
                  {line.status === 'ignored' ? t('rimp.action.restore') : t('rimp.action.ignore')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          {t('rimp.review.lines')} · {summary.total}
        </p>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={writing || !summary.ready}
          className="ms-auto rounded-xl"
        >
          {writing ? t('rimp.review.writing') : `${t('rimp.review.confirm')} · ${summary.ready}`}
        </Button>
      </div>
    </div>
  );
}