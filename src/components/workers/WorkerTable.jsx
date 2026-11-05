import { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

  const toggleSort = (key) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );

  const rows = [...workers].sort((a, b) => {
    if (!sort.key) {
      return definitionRank(a) - definitionRank(b) || (a.name || '').localeCompare(b.name || '');
    }
    return compare(a, b, sort.key, sort.dir) || (a.name || '').localeCompare(b.name || '');
  });

  const columns = [
    { key: 'name', label: t('workers.colWorker') },
    { key: 'farm', label: t('workers.colFarm') },
    { key: 'priority', label: t('workers.colPriority') },
    { key: 'team', label: t('workers.colTeam') },
    { key: 'rate', label: t('workers.colRate') },
    { key: 'declared', label: t('workers.colDeclared') },
    { key: 'transport', label: t('workers.colTransport') },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => {
              const active = sort.key === column.key;
              const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
              return (
                <TableHead key={column.key} className="whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className={cn(
                      'flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors',
                      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {column.label}
                    <Icon className={cn('h-3 w-3', active ? 'opacity-100' : 'opacity-40')} />
                  </button>
                </TableHead>
              );
            })}
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
  );
}