import { Boxes, Tractor, Truck, Users } from 'lucide-react';
import StatusPill from '@/components/StatusPill';
import ResourceGroup from '@/components/itinerary/ResourceGroup';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { natureLabel } from '@/lib/taskNature';

export default function OperationCard({ operation, natures = [] }) {
  const { t } = useI18n();

  const labourRows = operation.labour.map((line) => ({
    key: line.key,
    label: line.name || t('workers.unknown'),
    meta: `${fmtNum(line.days, 1)} ${t('itt.dayShort')}`,
  }));

  const machineryRows = operation.machinery.map((line) => ({
    key: line.key,
    label: line.fuel
      ? `${line.name || t('ms.unknown')} · ${fmtNum(line.fuel.quantity, 1)} ${line.fuel.unit} ${line.fuel.name}`
      : line.name || t('ms.unknown'),
    meta: `${fmtNum(line.hours, 1)} h × ${fmtMoney(line.rate)}`,
  }));

  const inputRows = operation.inputs.map((line) => ({
    key: line.key,
    label: line.name || t('inv.unknownInput'),
    meta: `${fmtNum(line.quantity, 1)} ${line.unit}`,
  }));

  const transportRows = (operation.transport || []).map((line) => ({
    key: line.key,
    label: line.name || t('lab.unknownTransporter'),
    meta: line.mode === 'per_person' ? t('lab.modePerPerson') : t('lab.modeFixed'),
  }));

  return (
    <li className="rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {fmtDate(operation.date)}
            </span>
            <StatusPill tone="moss">{natureLabel(operation.operation, natures, t)}</StatusPill>
          </div>
          {operation.description && (
            <p className="mt-1 text-sm leading-relaxed">{operation.description}</p>
          )}
        </div>
        <p className="text-sm font-medium tabular-nums">{fmtMoney(operation.totals.cost)}</p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <ResourceGroup icon={Users} title={t('itt.labour')} rows={labourRows} total={operation.totals.labour} />
        <ResourceGroup
          icon={Truck}
          title={t('itt.transport')}
          rows={transportRows}
          total={operation.totals.transport || 0}
        />
        <ResourceGroup
          icon={Tractor}
          title={t('itt.machinery')}
          rows={machineryRows}
          total={operation.totals.machinery}
        />
        <ResourceGroup icon={Boxes} title={t('itt.inputs')} rows={inputRows} total={operation.totals.inputs} />
      </div>
    </li>
  );
}