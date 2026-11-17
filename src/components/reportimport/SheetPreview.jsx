import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/I18nContext';
import { fmtNum } from '@/lib/format';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/reportimport/StatusBadge';

const sumDays = (labour = []) => labour.reduce((total, entry) => total + (Number(entry.days) || 0), 0);

export default function SheetPreview({ analysis }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(() => ({}));
  const [expanded, setExpanded] = useState({});

  return (
    <div className="space-y-3">
      {analysis.sheets.map((sheet) => {
        const isOpen = !!open[sheet.name];
        const rows = expanded[sheet.name] ? sheet.rows : sheet.rows.slice(0, 10);
        const farmNames = sheet.farmNames || [];
        const dates = sheet.dates || [];
        const multiFarm = farmNames.length > 1;

        return (
          <section key={sheet.name} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
            <button
              type="button"
              onClick={() => setOpen((prev) => ({ ...prev, [sheet.name]: !isOpen }))}
              className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-accent/40"
            >
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
              />
              <span className="font-medium">{sheet.name}</span>
              <span className="text-xs text-muted-foreground">
                {[farmNames.join(' · '), dates.join(' · ')].filter(Boolean).join(' · ') || '—'}
              </span>
              <StatusBadge tone={sheet.issue ? 'warn' : 'ok'} className="ms-auto">
                {sheet.issue ? t(`rimp.issue.${sheet.issue}`) : t('rimp.rowsCount', { n: sheet.rows.length })}
              </StatusBadge>
            </button>

            {isOpen && (
              <div className="border-t border-border/60">
                {!sheet.rows.length ? (
                  <p className="px-4 py-4 text-xs text-muted-foreground">{t('rimp.noRows')}</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-[12px]">
                        <thead>
                          <tr className="bg-secondary/60 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                            {multiFarm && (
                              <th className="px-4 py-2 text-start font-medium">{t('rimp.col.farm')}</th>
                            )}
                            <th className="px-4 py-2 text-start font-medium">{t('rimp.col.place')}</th>
                            <th className="px-3 py-2 text-start font-medium">{t('rimp.col.nature')}</th>
                            <th className="px-3 py-2 text-end font-medium">{t('rimp.col.work')}</th>
                            <th className="px-3 py-2 text-end font-medium">{t('rimp.col.labour')}</th>
                            <th className="px-3 py-2 text-start font-medium">{t('rimp.col.machinery')}</th>
                            <th className="px-4 py-2 text-start font-medium">{t('rimp.col.inputs')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={row.key} className="border-t border-border/50">
                              {multiFarm && (
                                <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                                  {row.farmName || '—'}
                                </td>
                              )}
                              <td className="px-4 py-2 font-medium">{row.place}</td>
                              <td className="px-3 py-2">{row.nature || '—'}</td>
                              <td className="px-3 py-2 text-end tabular-nums text-muted-foreground">
                                {row.work === null ? '—' : fmtNum(row.work, 1)}
                              </td>
                              <td className="px-3 py-2 text-end tabular-nums">
                                {sumDays(row.labour)
                                  ? t('rimp.daysCount', { n: fmtNum(sumDays(row.labour), 2) })
                                  : '—'}
                              </td>
                              <td className="px-3 py-2">
                                {row.machinery
                                  ? `${row.machinery.name} · ${fmtNum(row.machinery.hours, 1)} h`
                                  : '—'}
                              </td>
                              <td className="px-4 py-2">
                                {row.input
                                  ? `${row.input.name} ${fmtNum(row.input.quantity, 2)} ${row.input.unit || ''}`.trim()
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {sheet.rows.length > 10 && (
                      <button
                        type="button"
                        onClick={() => setExpanded((prev) => ({ ...prev, [sheet.name]: !prev[sheet.name] }))}
                        className="w-full border-t border-border/50 px-4 py-2 text-[11px] text-primary hover:bg-accent/40"
                      >
                        {expanded[sheet.name]
                          ? t('rimp.showLess')
                          : `${t('rimp.showAll')} (${sheet.rows.length})`}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}