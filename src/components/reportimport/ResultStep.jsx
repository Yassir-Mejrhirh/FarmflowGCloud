import { CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/I18nContext';
import { Button } from '@/components/ui/button';
import { fmtDate } from '@/lib/format';

export default function ResultStep({ result, onRestart }) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.8} />
        <div>
          <p className="font-display text-lg tracking-tight">{t('rimp.result.title')}</p>
          <p className="mt-1 text-sm text-primary">{t('rimp.result.created', { n: result.created })}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('rimp.result.linesTotal', { n: result.total })}
          </p>
        </div>
      </div>

      {result.failed.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <header className="border-b border-border/60 bg-secondary/50 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {t('rimp.result.failed', { n: result.failed.length })}
          </header>
          <ul className="max-h-[260px] divide-y divide-border/50 overflow-y-auto">
            {result.failed.map((line) => (
              <li key={line.key} className="flex flex-wrap items-center gap-2 px-4 py-2 text-[12px]">
                <span className="tabular-nums text-muted-foreground">{fmtDate(line.date)}</span>
                <span className="font-medium">{line.place}</span>
                <span className="truncate text-muted-foreground">{line.nature || '—'}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-border/50 px-4 py-2 text-[11px] text-muted-foreground">
            {t('rimp.result.failedHint')}
          </p>
        </section>
      )}

      <Button type="button" variant="outline" onClick={onRestart} className="rounded-xl">
        {t('rimp.result.restart')}
      </Button>
    </div>
  );
}