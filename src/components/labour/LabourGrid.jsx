import { Users } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const dayNumber = (date) => String(date).slice(8, 10);

export default function LabourGrid({ groups, days, loading }) {
  const { t } = useI18n();

  if (loading) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  if (!groups.length) {
    return <EmptyState icon={Users} title={t('lab.emptyTitle')} description={t('lab.emptyDesc')} />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-secondary/50 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            <th className="whitespace-nowrap px-3 py-2 text-start font-medium">{t('lab.fullName')}</th>
            <th className="whitespace-nowrap px-2 py-2 text-end font-medium">{t('lab.salaryDay')}</th>
            {days.map((date) => (
              <th key={date} className="w-7 px-0 py-2 text-center font-medium tabular-nums" title={date}>
                {dayNumber(date)}
              </th>
            ))}
            <th className="whitespace-nowrap px-2 py-2 text-end font-medium">{t('lab.totalDays')}</th>
            <th className="whitespace-nowrap px-3 py-2 text-end font-medium">{t('lab.totalPay')}</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <GroupRows key={group.key} group={group} days={days} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({ group, days }) {
  const { t } = useI18n();

  return (
    <>
      <tr>
        <td
          colSpan={days.length + 4}
          className="border-y border-border/60 bg-muted/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
        >
          {group.label}
        </td>
      </tr>
      {group.rows.map((row) => (
        <tr key={row.key} className="border-b border-border/40 last:border-0">
          <td className="whitespace-nowrap px-3 py-1.5">
            <span className={row.transporter ? 'text-xs italic text-clay' : 'font-medium'}>
              {row.name}
            </span>
            {row.job && <span className="ms-2 text-[11px] text-muted-foreground">{row.job}</span>}
          </td>
          <td className="whitespace-nowrap px-2 py-1.5 text-end text-xs tabular-nums text-muted-foreground">
            {row.transporter ? '—' : row.salary ? fmtMoney(row.salary) : t('workers.noRate')}
          </td>
          {days.map((date) => {
            const worked = (row.dates.get(date) || 0) > 0;
            return (
              <td
                key={date}
                className={`px-0 py-1.5 text-center text-[11px] font-semibold ${
                  row.transporter
                    ? 'text-muted-foreground/40'
                    : worked
                      ? 'text-primary'
                      : 'text-muted-foreground/50'
                }`}
              >
                {row.transporter ? '·' : worked ? 'X' : 'O'}
              </td>
            );
          })}
          <td className="whitespace-nowrap px-2 py-1.5 text-end text-xs tabular-nums text-muted-foreground">
            {row.transporter ? '—' : fmtNum(row.days, 1)}
          </td>
          <td className="whitespace-nowrap px-3 py-1.5 text-end text-sm font-medium tabular-nums">
            {fmtMoney(row.total)}
          </td>
        </tr>
      ))}
      {group.rows.length > 0 && (
        <tr>
          <td colSpan={days.length + 3} className="px-3 py-1 text-end text-[11px] text-muted-foreground">
            {t('lab.groupDays', { days: fmtNum(group.rows.reduce((sum, row) => sum + row.days, 0), 1) })}
          </td>
          <td className="px-3 py-1 text-end text-[11px] tabular-nums text-muted-foreground">
            {fmtMoney(group.total)}
          </td>
        </tr>
      )}
    </>
  );
}