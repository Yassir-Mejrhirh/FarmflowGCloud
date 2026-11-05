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

  const rows = [...workers].sort(
    (a, b) => definitionRank(a) - definitionRank(b) || (a.name || '').localeCompare(b.name || ''),
  );

  const columns = [
    t('workers.colWorker'),
    t('workers.colFarm'),
    t('workers.colPriority'),
    t('workers.colTeam'),
    t('workers.colRate'),
    t('workers.colDeclared'),
    t('workers.colTransport'),
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column}
                className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              >
                {column}
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
  );
}