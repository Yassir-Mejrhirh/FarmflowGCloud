import { Fragment, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import WorkerFilters from '@/components/workers/WorkerFilters';
import WorkerRow from '@/components/workers/WorkerRow';
import WorkerFarmHeader from '@/components/workers/WorkerFarmHeader';
import WorkerTeamHeader from '@/components/workers/WorkerTeamHeader';
import { buildWorkerSections, sortWorkers } from '@/lib/workerSections';
import { todayISO } from '@/lib/format';
import { buildRateIndex, rateFor } from '@/lib/wageRates';
import { buildTransportIndex } from '@/lib/transportRates';
import {
  EMPTY_WORKER_FILTERS,
  filterOptions,
  hasActiveFilters,
  workerMatchesFilters,
} from '@/lib/workerFilters';
import { useI18n } from '@/lib/I18nContext';

export default function WorkerTable({ workers, rates = [], transportRates = [], onEdit, onRates }) {
  const { t } = useI18n();
  const [filters, setFilters] = useState(EMPTY_WORKER_FILTERS);
  // Teams start collapsed; each header opens or closes its own section.
  const [openTeams, setOpenTeams] = useState({});

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

  const rows = workers
    .map((worker) => ({ ...worker, applied_rate: rateFor(worker, rateIndex, today) }))
    .sort(sortWorkers);

  const visible = rows.filter((worker) =>
    workerMatchesFilters(worker, filters, transportIndex, today),
  );

  const filtersActive = hasActiveFilters(filters);
  // Without filters the list is read by farm and by team, teams folded away.
  const sections = buildWorkerSections(visible);
  const toggleTeam = (key) => setOpenTeams((prev) => ({ ...prev, [key]: !prev[key] }));

  const renderRow = (worker) => (
    <WorkerRow key={worker.id} worker={worker} t={t} onEdit={onEdit} onRates={onRates} />
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
            {filtersActive ? (
              <>
                {visible.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
                      {t('wfilters.none')}
                    </TableCell>
                  </TableRow>
                )}
                {visible.map(renderRow)}
              </>
            ) : (
              <>
                {sections.farmBlocks.map((block) => (
                  <Fragment key={`farm-${block.farm || 'none'}`}>
                    <WorkerFarmHeader farm={block.farm} count={block.rows.length} />
                    {block.rows.map(renderRow)}
                  </Fragment>
                ))}
                {sections.teams.map((team) => (
                  <Fragment key={`team-${team.key}`}>
                    <WorkerTeamHeader
                      team={team}
                      open={Boolean(openTeams[team.key])}
                      onToggle={() => toggleTeam(team.key)}
                    />
                    {Boolean(openTeams[team.key]) && team.rows.map(renderRow)}
                  </Fragment>
                ))}
                {sections.rest.map(renderRow)}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}