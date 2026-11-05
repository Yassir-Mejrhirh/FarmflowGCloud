import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import WorkerSortDialog from '@/components/workers/WorkerSortDialog';
import { fmtMoney } from '@/lib/format';
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

const SORT_VALUES = {
  name: (worker) => (worker.name || '').toLowerCase(),
  farm: (worker) => (worker.farm || '').toLowerCase(),
  priority: (worker) => Number(worker.priority) || 9,
  team: (worker) => (worker.team || '\uffff').toLowerCase(),
  rate: (worker) => Number(worker.daily_rate) || 0,
  declared: (worker) => (worker.declared ? 1 : 0),
  transport: (worker) => (hasTransport(worker) ? 1 : 0),
};

const compare = (a, b, key, dir) => {
  const valueA = SORT_VALUES[key](a);
  const valueB = SORT_VALUES[key](b);
  let result = 0;
  if (valueA < valueB) result = -1;
  if (valueA > valueB) result = 1;
  return dir === 'desc' ? -result : result;
};

function Dot({ tone, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn('h-2.5 w-2.5 rounded-full', DOTS[tone])} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

export default function WorkerTable({ workers, onEdit }) {
  const { t } = useI18n();
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [sortOpen, setSortOpen] = useState(false);

  const columns = [
    { key: 'name', label: t('workers.colWorker') },
    { key: 'farm', label: t('workers.colFarm') },
    { key: 'priority', label: t('workers.colPriority') },
    { key: 'team', label: t('workers.colTeam') },
    { key: 'rate', label: t('workers.colRate') },
    { key: 'declared', label: t('workers.colDeclared') },
    { key: 'transport', label: t('workers.colTransport') },
  ];

  const rows = [...workers].sort((a, b) => {
    if (!sort.key) {
      return definitionRank(a) - definitionRank(b) || (a.name || '').localeCompare(b.name || '');
    }
    return compare(a, b, sort.key, sort.dir) || (a.name || '').localeCompare(b.name || '');
  });

  const activeColumn = columns.find((column) => column.key === sort.key);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {activeColumn ? `${t('workers.sortedBy')} ${activeColumn.label}` : t('workers.sortDefault')}
        </p>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setSortOpen(true)}>
          <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" /> {t('workers.sortOpen')}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((worker) => {
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
                    {worker.farm || t('workers.mobile')}
                  </TableCell>
                  <TableCell className="tabular-nums">{worker.priority || '1'}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {worker.team || t('workers.notApplicable')}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {worker.daily_rate ? fmtMoney(worker.daily_rate) : '—'}
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

      <WorkerSortDialog
        open={sortOpen}
        onOpenChange={setSortOpen}
        options={columns}
        sort={sort}
        onChange={setSort}
      />
    </div>
  );
}