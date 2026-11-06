import { History } from 'lucide-react';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { countValue } from '@/lib/countStock';

export default function CountHistory({ counts, storages, onOpen }) {
  const { t } = useI18n();
  const storageName = (id) => storages.find((storage) => storage.id === id)?.name || '—';

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <History className="h-3.5 w-3.5" strokeWidth={1.9} />
        </span>
        <div>
          <h2 className="font-display text-base leading-tight tracking-tight">{t('stockCount.historyTitle')}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t('stockCount.historyHint')}</p>
        </div>
      </div>

      {counts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
          {t('stockCount.historyEmpty')}
        </p>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
          {counts.map((count) => (
            <li
              key={count.id}
              role="button"
              tabIndex={0}
              onDoubleClick={() => onOpen(count)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpen(count);
                }
              }}
              className="flex cursor-pointer select-none flex-wrap items-center gap-3 px-3 py-2.5 transition-colors duration-200 hover:bg-secondary/40 focus:outline-none focus-visible:bg-secondary/50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{fmtDate(count.date)}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {[storageName(count.storage_id), count.responsible].filter(Boolean).join(' · ')}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t('inv.countLines', { n: (count.lines || []).length })}
              </p>
              <p className="text-sm tabular-nums">{fmtMoney(countValue(count))}</p>
            </li>
          ))}
        </ul>
      )}

      {counts.length > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {fmtNum(counts.length, 0)} · {t('stockCount.historyDoubleClick')}
        </p>
      )}
    </section>
  );
}