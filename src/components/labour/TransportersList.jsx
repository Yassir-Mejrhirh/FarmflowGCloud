import { Truck } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function TransportersList({ rows = [], total = 0, loading }) {
  const { t } = useI18n();

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-lg tracking-tight">{t('lab.transporters')}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('lab.transportersDesc')}</p>
        </div>
        {rows.length > 0 && <p className="text-sm font-medium tabular-nums">{fmtMoney(total)}</p>}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Truck} title={t('lab.transportEmpty')} description={t('lab.transportEmptyDesc')} />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          <li className="hidden bg-secondary/40 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:flex sm:gap-3">
            <span className="flex-1">{t('lab.transporter')}</span>
            <span className="w-24">{t('lab.transportMode')}</span>
            <span className="w-24 text-end">{t('lab.transportDaily')}</span>
            <span className="w-16 text-end">{t('lab.transportDays')}</span>
            <span className="w-28 text-end">{t('lab.transportTotal')}</span>
          </li>
          {rows.map((row) => (
            <li key={row.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.name || t('lab.unknownTransporter')}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {row.team ? t('lab.transportTeam', { team: row.team }) : t('lab.transportNoTeam')}
                </p>
              </div>
              <span className="w-24 text-xs text-muted-foreground">
                {row.mode === 'per_person' ? t('lab.modePerPerson') : t('lab.modeFixed')}
              </span>
              <span className="w-24 text-end text-xs tabular-nums text-muted-foreground">{fmtMoney(row.rate)}</span>
              <span className="w-16 text-end text-sm tabular-nums">{fmtNum(row.dates, 1)}</span>
              <span className="w-28 text-end text-sm tabular-nums">{fmtMoney(row.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}