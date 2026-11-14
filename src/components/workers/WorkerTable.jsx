import { useState } from 'react';
import { History } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import WorkerFilters from '@/components/workers/WorkerFilters';
import { workerFarmNames } from '@/lib/workerFarms';
import { fmtMoney, todayISO } from '@/lib/format';
import { buildRateIndex, rateFor } from '@/lib/wageRates';
import { buildTransportIndex } from '@/lib/transportRates';
import {
  EMPTY_WORKER_FILTERS,
  filterOptions,
  hasActiveFilters,
  workerMatchesFilters,
} from '@/lib/workerFilters';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const definitionRank = (worker) =>
  worker.definition === 'nominative' ? 0 : worker.definition === 'salary_band' ? 2 : 1;

const hasTransport = (worker) =>
  Boolean(worker.transport_enabled || worker.transporter_name || worker.transport_rate);

const DOTS = {
  green: 'bg-emerald-500',
  red: 'bg-rose-500',
  orange: 'bg-amber-500',
};

function Dot({ tone, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn('h-2.5 w-2.5 rounded-full', DOTS[tone])} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

export default function WorkerTable({ workers, rates = [], transportRates = [], onEdit, onRates }) {
  const { t } = useI18n();
  const [filters, setFilters] = useState(EMPTY_WORKER_FILTERS);

  // The rate shown is the one in force today, taken from the dated history.
  const rateIndex = buildRateIndex(rates);
  const transportIndex = buildTransportIndex(transportRates);
  const today = todayISO();

  const columns = [
    t('workers.colWorker'),
    t('workers.colFarm'),
    t('workers.colPriority'),
    t('workers.colTeam'),
    t('workers.colRate'),
    t('workers.colDeclared'),
    t('workers.colTransport'),
  ];

  // Default order: nominatives first, then by name.
  const rows = workers
    .map((worker) => ({ ...worker, applied_rate: rateFor(worker, rateIndex, today) }))
    .sort(
      (a, b) =>
        definitionRank(a) - definitionRank(b) || (a.name || '').localeCompare(b.name || ''),
    );

  const visible = rows.filter((worker) =>
    workerMatchesFilters(worker, filters, transportIndex, today),
  );

  return (
    <div className="space-y-3">
      <WorkerFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_WORKER_FILTERS)}
        options={filterOptions(rows, transportIndex, today)}
        shown={visible.length}
        total={rows.length}
      />

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((label) => (
                <TableHead
                  key={label}
                  className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && hasActiveFilters(filters) && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
                  {t('wfilters.none')}
                </TableCell>
              </TableRow>
            )}
            {visible.map((worker) => {
              const declared = Boolean(worker.declared);
              const transport = hasTransport(worker);
              return (
                <TableRow key={worker.id} onClick={() => onEdit(worker)} className="cursor-pointer">
                  <TableCell className="whitespace-nowrap">
                    <span className="font-medium">{worker.name}</span>
                    {worker.worker_function && (
                      <span className="ml-2 text-xs text-muted-foreground">{worker.worker_function}</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {worker.farm ||
                      (workerFarmNames(worker).length
                        ? `${t('workers.mobile')} · ${workerFarmNames(worker).join(', ')}`
                        : t('workers.mobile'))}
                  </TableCell>
                  <TableCell className="tabular-nums">{worker.priority || '1'}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {worker.team || t('workers.notApplicable')}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      {worker.applied_rate ? fmtMoney(worker.applied_rate) : '—'}
                      {onRates && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRates(worker);
                          }}
                          aria-label={t('wage.history')}
                          title={t('wage.history')}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Dot tone={declared ? 'green' : 'red'} label={declared ? t('workers.declared') : t('workers.undeclared')} />
                  </TableCell>
                  <TableCell>
                    <Dot tone={transport ? 'green' : 'orange'} label={transport ? t('workers.transportOn') : t('workers.transportOff')} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}