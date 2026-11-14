import { History } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { workerFarmNames } from '@/lib/workerFarms';
import { fmtMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

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

export default function WorkerRow({ worker, t, onEdit, onRates }) {
  const declared = Boolean(worker.declared);
  const transport = Boolean(
    worker.transport_enabled || worker.transporter_name || worker.transport_rate,
  );

  return (
    <TableRow onClick={() => onEdit(worker)} className="cursor-pointer">
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
        <Dot
          tone={transport ? 'green' : 'orange'}
          label={transport ? t('workers.transportOn') : t('workers.transportOff')}
        />
      </TableCell>
    </TableRow>
  );
}