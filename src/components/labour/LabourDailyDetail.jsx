import { CalendarDays } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function LabourDailyDetail({ groups, loading }) {
  const { t } = useI18n();

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg tracking-tight">{t('lab.detail')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('lab.detailDesc')}</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : groups.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t('lab.detailEmpty')} description={t('lab.detailEmptyDesc')} />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {groups.map((group) => (
            <li key={group.date} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{fmtDate(group.date)}</p>
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {t('lab.dayTotal', {
                    days: `${fmtNum(group.days, 1)} ${t('lab.daysUnit')}`,
                    cost: fmtMoney(group.cost),
                  })}
                </p>
              </div>
              <ul className="mt-2 space-y-1.5">
                {group.entries.map((entry) => (
                  <li key={entry.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="font-medium">{entry.worker}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {fmtNum(entry.days, 1)} {t('lab.daysUnit')}
                    </span>
                    <span className="ms-auto text-[11px] text-muted-foreground">
                      {[entry.place, entry.block].filter(Boolean).join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}