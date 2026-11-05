import { Phone } from 'lucide-react';
import StatusPill from '@/components/StatusPill';
import { fmtMoney } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export default function WorkerCard({ worker, onEdit }) {
  const { t } = useI18n();
  const subtitle =
    worker.worker_function || (worker.definition ? t(`wr.def_${worker.definition}`) : '');
  const transport = worker.transporter_name
    ? `${worker.transporter_name} · ${
        worker.transport_rate_type === 'per_person'
          ? t('workerDialog.transportPerPerson')
          : t('workerDialog.transportFixed')
      }${worker.transport_rate ? ` ${fmtMoney(worker.transport_rate)}` : ''}`
    : '';

  return (
    <button
      type="button"
      onClick={onEdit}
      className="rounded-2xl border border-border/70 bg-card p-5 text-start transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-38px_rgba(20,45,35,0.9)]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm text-primary">
          {initials(worker.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{worker.name}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <StatusPill tone={worker.priority === '3' ? 'stone' : worker.priority === '2' ? 'amber' : 'moss'}>
          {t('workerDialog.priority')} {worker.priority || '1'}
        </StatusPill>
      </div>

      <p className="mt-3 truncate text-xs text-muted-foreground">
        {worker.declared ? t('workers.declared') : t('workers.undeclared')}
        {worker.registration_number ? ` · ${worker.registration_number}` : ''}
      </p>
      {transport && <p className="mt-1 truncate text-xs text-muted-foreground">{transport}</p>}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">
          {worker.daily_rate ? `${fmtMoney(worker.daily_rate)} ${t('workers.perDay')}` : t('workers.noRate')}
        </span>
        {worker.phone && (
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" /> {worker.phone}
          </span>
        )}
      </div>
    </button>
  );
}