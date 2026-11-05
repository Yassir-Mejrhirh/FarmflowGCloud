import { ClipboardCheck } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function CountList({ counts, storages }) {
  const { t } = useI18n();
  const storageName = (id) => storages.find((storage) => storage.id === id)?.name || '—';

  if (!counts.length) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={t('inv.emptyCountsTitle')}
        description={t('inv.emptyCountsDesc')}
        action={
          <Button asChild>
            <Link to="/stock-count">{t('inv.newCount')}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
      {counts.map((count) => {
        const lines = count.lines || [];
        const total = lines.reduce(
          (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
          0,
        );
        return (
          <li key={count.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{fmtDate(count.date)}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[storageName(count.storage_id), count.responsible].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t('inv.countLines', { n: lines.length })}
              </p>
            </div>
            <div className="text-end">
              <p className="text-sm tabular-nums">{fmtMoney(total)}</p>
              <p className="text-[11px] text-muted-foreground">
                {fmtNum(
                  lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0),
                  1,
                )}{' '}
                {t('inv.countUnits')}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}