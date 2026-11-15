import { useMemo, useState } from 'react';
import { ChevronDown, ClipboardList } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { buildRateIndex } from '@/lib/wageRates';
import { buildTransportIndex } from '@/lib/transportRates';
import { buildPointageCosts } from '@/lib/pointageCosts';
import { cn } from '@/lib/utils';

function Amount({ label, value, className }) {
  return (
    <span className={cn('text-[11px] tabular-nums text-muted-foreground', className)}>
      {label} <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

export default function PointageValidation({
  pointages = [],
  reports = [],
  workers = [],
  wageRates = [],
  transportRates = [],
  blocks = [],
  loading,
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState([]);

  const rateIndex = useMemo(() => buildRateIndex(wageRates), [wageRates]);
  const transportIndex = useMemo(() => buildTransportIndex(transportRates), [transportRates]);
  const blockMap = useMemo(
    () => Object.fromEntries(blocks.map((block) => [block.id, block])),
    [blocks],
  );

  const { rows, totals } = useMemo(
    () =>
      buildPointageCosts({
        sheets: pointages,
        reports,
        workers,
        rateIndex,
        transportIndex,
        blockMap,
        unknownLabel: t('lab.unknownLabel'),
      }),
    [pointages, reports, workers, rateIndex, transportIndex, blockMap, t],
  );

  const toggle = (id) =>
    setOpen((current) => (current.includes(id) ? current.filter((key) => key !== id) : [...current, id]));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg tracking-tight">{t('lab.ptgValidationTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length
            ? t('lab.ptgValidationSummary', {
                n: rows.length,
                days: fmtNum(totals.remaining, 1),
              })
            : t('lab.ptgValidationDesc')}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t('lab.ptgNoneTitle')}
          description={t('lab.ptgNoneDesc')}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-card px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t('lab.ptgPointed')}</p>
              <p className="mt-1 font-display text-lg tabular-nums">{fmtNum(totals.pointed, 1)}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t('lab.ptgRemaining')}</p>
              <p className="mt-1 font-display text-lg tabular-nums text-clay">{fmtNum(totals.remaining, 1)}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t('lab.ptgWage')}</p>
              <p className="mt-1 font-display text-lg tabular-nums">{fmtMoney(totals.wage)}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t('lab.ptgTransport')}</p>
              <p className="mt-1 font-display text-lg tabular-nums">{fmtMoney(totals.transport)}</p>
            </div>
          </div>

          <ul className="space-y-2">
            {rows.map((row) => {
              const expanded = open.includes(row.id);
              return (
                <li key={row.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                  <button
                    type="button"
                    onClick={() => toggle(row.id)}
                    className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-start"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{fmtDate(row.date)}</span>
                      <span className="block text-[11px] text-muted-foreground">{row.farm}</span>
                    </span>
                    <span
                      className={cn(
                        'ms-auto rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        row.remaining > 0
                          ? 'border-clay/40 bg-clay/10 text-clay'
                          : 'border-border bg-muted/40 text-muted-foreground',
                      )}
                    >
                      {row.remaining > 0
                        ? t('lab.ptgDaysRemaining', { n: fmtNum(row.remaining, 1) })
                        : t('lab.ptgPending')}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                        expanded && 'rotate-180',
                      )}
                    />
                    <span className="flex w-full flex-wrap items-center gap-x-3 gap-y-1">
                      <Amount label={t('lab.ptgPointed')} value={fmtNum(row.pointed, 1)} />
                      <Amount label={t('lab.ptgWage')} value={fmtMoney(row.wage)} />
                      <Amount label={t('lab.ptgTransport')} value={fmtMoney(row.transport)} />
                      <Amount label={t('lab.ptgTotal')} value={fmtMoney(row.total)} className="ms-auto" />
                    </span>
                  </button>

                  {expanded && (
                    <div className="space-y-3 border-t border-border/60 px-4 py-3">
                      {row.lines.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t('lab.ptgNoDays')}</p>
                      ) : (
                        <>
                          <ul className="space-y-2.5">
                            {row.lines.map((line) => (
                              <li key={line.id} className="border-s-2 border-primary/20 ps-2.5">
                                <div className="flex flex-wrap items-baseline gap-x-2">
                                  <p className="text-sm font-medium">{line.name}</p>
                                  {line.team && (
                                    <span className="text-[10px] text-muted-foreground">{line.team}</span>
                                  )}
                                  <span className="ms-auto text-sm font-medium tabular-nums">
                                    {fmtMoney(line.total)}
                                  </span>
                                </div>
                                <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-muted-foreground">
                                  <span>{t('lab.ptgPointedShort', { n: fmtNum(line.pointed, 1) })}</span>
                                  <span>{t('lab.ptgGivenShort', { n: fmtNum(line.given, 1) })}</span>
                                  {line.remaining > 0 && (
                                    <span className="font-medium text-clay">
                                      {t('lab.ptgRemainingShort', { n: fmtNum(line.remaining, 1) })}
                                    </span>
                                  )}
                                  <span>{fmtMoney(line.rate)}/{t('lab.daysUnit')}</span>
                                  <span>{t('lab.ptgWage')} {fmtMoney(line.wage)}</span>
                                  <span>{t('lab.ptgTransport')} {fmtMoney(line.transport)}</span>
                                </p>
                              </li>
                            ))}
                          </ul>

                          {row.teams.length > 1 && (
                            <div className="rounded-xl bg-muted/50 px-3 py-2">
                              {row.teams.map((team) => (
                                <p
                                  key={team.name || 'none'}
                                  className="flex flex-wrap items-center gap-x-2 py-0.5 text-[11px] text-muted-foreground"
                                >
                                  <span className="font-medium text-foreground">
                                    {team.name ? t('lab.ptgTeamTotal', { name: team.name }) : t('lab.ptgNoTeam')}
                                  </span>
                                  <span className="tabular-nums">{fmtNum(team.pointed, 1)}</span>
                                  <span className="ms-auto tabular-nums">{fmtMoney(team.total)}</span>
                                </p>
                              ))}
                            </div>
                          )}

                          <p className="flex flex-wrap items-center gap-x-2 border-t border-dashed border-border/70 pt-2 text-[11px] text-muted-foreground">
                            <span className="font-medium text-foreground">{t('lab.ptgSheetTotal')}</span>
                            <span className="ms-auto tabular-nums">{fmtMoney(row.total)}</span>
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}