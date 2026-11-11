import { fmtDate, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

function Head({ children, align = 'start' }) {
  return (
    <th
      className={cn(
        'whitespace-nowrap px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground',
        align === 'end' ? 'text-end' : 'text-start',
      )}
    >
      {children}
    </th>
  );
}

const Cell = ({ children, className }) => (
  <td className={cn('px-3 py-2.5 align-top text-xs', className)}>{children}</td>
);

const dash = <span className="text-muted-foreground">—</span>;

const amount = (value, unit) =>
  `${fmtNum(value, 1)}${unit ? ` ${unit}` : ''}`;

export default function MachineTrackingTable({ rows = [], totals }) {
  const { t } = useI18n();
  const unit = totals?.fuelUnit || '';

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        {t('mtr.noRows')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card">
      <table className="w-full min-w-[980px] border-collapse">
        <thead>
          <tr className="border-b border-border/70 bg-secondary/40">
            <Head>{t('mtr.date')}</Head>
            <Head align="end">{t('mtr.counterHour')}</Head>
            <Head align="end">{t('mtr.hours')}</Head>
            <Head>{t('mtr.works')}</Head>
            <Head>{t('mtr.vidangeCol')}</Head>
            <Head>{t('mtr.maintenanceCol')}</Head>
            <Head align="end">{t('mtr.fuelCol')}</Head>
            <Head align="end">{t('mtr.consumption')}</Head>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date} className="border-b border-border/50 last:border-0 hover:bg-secondary/25">
              <Cell className="whitespace-nowrap font-medium">{fmtDate(row.date)}</Cell>
              <Cell className="whitespace-nowrap text-end tabular-nums">{`${fmtNum(row.counter, 0)} h`}</Cell>
              <Cell className="whitespace-nowrap text-end tabular-nums">
                {row.hours > 0 ? `${fmtNum(row.hours, 1)} h` : dash}
              </Cell>

              <Cell>
                {row.works.length === 0
                  ? dash
                  : row.works.map((work) => (
                      <span key={work.key} className="block leading-snug">
                        {work.label || t(`tt.${work.type}`)}
                      </span>
                    ))}
              </Cell>

              <Cell>
                {row.vidange.length === 0
                  ? dash
                  : row.vidange.map((entry) => (
                      <span key={entry.id} className="block leading-snug">
                        <span>
                          {entry.reading > 0
                            ? `${t('mtr.reading')} ${fmtNum(entry.reading, 0)} h`
                            : `${fmtNum(entry.since, 0)} h`}
                        </span>
                        {!entry.first && entry.reading > 0 && (
                          <span className="block text-[11px] text-muted-foreground">
                            +{fmtNum(entry.since, 0)} h
                          </span>
                        )}
                      </span>
                    ))}
              </Cell>

              <Cell>
                {row.maintenance.length === 0
                  ? dash
                  : row.maintenance.map((log) => (
                      <span key={log.id} className="block leading-snug">
                        <span>{t(`mk.${log.kind}`)}</span>
                        {log.description && (
                          <span className="block text-[11px] text-muted-foreground">{log.description}</span>
                        )}
                      </span>
                    ))}
              </Cell>

              <Cell className="whitespace-nowrap text-end tabular-nums">
                {row.fuel > 0 ? amount(row.fuel, row.fuelUnit || unit) : dash}
              </Cell>
              <Cell className="whitespace-nowrap text-end tabular-nums">
                {row.consumption === null
                  ? dash
                  : `${fmtNum(row.consumption, 2)}${row.fuelUnit || unit ? ` ${row.fuelUnit || unit}/h` : ''}`}
              </Cell>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border/70 bg-secondary/30 font-medium">
            <Cell className="whitespace-nowrap">{t('mtr.total')}</Cell>
            <Cell className="text-end tabular-nums">{`${fmtNum(totals?.counter || 0, 0)} h`}</Cell>
            <Cell className="text-end tabular-nums">{`${fmtNum(totals?.hours || 0, 1)} h`}</Cell>
            <Cell />
            <Cell className="whitespace-nowrap">{totals?.vidanges ? `${totals.vidanges}` : ''}</Cell>
            <Cell />
            <Cell className="text-end tabular-nums">
              {totals?.fuel ? amount(totals.fuel, totals.fuelUnit) : dash}
            </Cell>
            <Cell className="text-end tabular-nums">
              {totals?.consumption === null || totals?.consumption === undefined
                ? dash
                : `${fmtNum(totals.consumption, 2)}${totals.fuelUnit ? ` ${totals.fuelUnit}/h` : ''}`}
            </Cell>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}