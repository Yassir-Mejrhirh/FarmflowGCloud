import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Tractor } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusPill from '@/components/StatusPill';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import MachineDialog, { machineTypeLabel } from '@/components/machinery/MachineDialog';
import MachinePhoto from '@/components/machinery/MachinePhoto';
import { fetchList } from '@/lib/data';
import { buildMachineCosts, logTotalCost } from '@/lib/machineryCosts';
import { fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
const STATUS_TONE = { operational: 'moss', maintenance: 'amber', retired: 'stone' };

export default function Machinery() {
  const { t } = useI18n();
  const [machines, setMachines] = useState([]);
  const [logs, setLogs] = useState([]);
  const [types, setTypes] = useState([]);
  const [reports, setReports] = useState([]);
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [machineDialog, setMachineDialog] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadTypes = async () => {
    const rows = await fetchList(base44.entities.MachineType, {}, { sort: 'name' });
    setTypes(rows);
  };

  const load = async () => {
    const [machineRows, logRows, reportRows, itemRows, invoiceRows, countRows] = await Promise.all([
      fetchList(base44.entities.Machine, {}, { sort: 'name' }),
      fetchList(base44.entities.MaintenanceLog, {}, { sort: '-date' }),
      fetchList(base44.entities.DailyReport, {}, { sort: '-date' }),
      fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
      fetchList(base44.entities.InputInvoice, {}, { sort: '-date' }),
      fetchList(base44.entities.InventoryCount, {}),
      loadTypes(),
    ]);
    setMachines(machineRows);
    setLogs(logRows);
    setReports(reportRows);
    setItems(itemRows);
    setInvoices(invoiceRows);
    setCounts(countRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const serviceCost = logs.reduce((sum, log) => sum + logTotalCost(log), 0);
  const costRows = useMemo(
    () => buildMachineCosts({ machines, logs, reports, items, invoices, counts }),
    [machines, logs, reports, items, invoices, counts],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('mach.eyebrow')}
        title={t('mach.title')}
        description={t('mach.description')}
        action={
          <Button
            className="rounded-xl"
            onClick={() => {
              setEditing(null);
              setMachineDialog(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> {t('mach.newMachine')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label={t('mach.machines')} value={machines.length} />
        <MiniStat label={t('mach.hoursLogged')} value={fmtNum(machines.reduce((sum, m) => sum + (Number(m.hours) || 0), 0), 0)} />
        <MiniStat label={t('mach.serviceSpend')} value={fmtMoney(serviceCost)} />
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : machines.length === 0 ? (
        <EmptyState
          icon={Tractor}
          title={t('mach.emptyTitle')}
          description={t('mach.emptyDesc')}
          action={<Button onClick={() => setMachineDialog(true)}>{t('mach.add')}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {machines.map((machine) => (
            <div key={machine.id} className="rounded-2xl border border-border/70 bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-lg leading-tight">{machine.name}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {machineTypeLabel(machine.type, types, t)}
                    {machine.plate ? ` · ${machine.plate}` : ''}
                  </p>
                </div>
                <StatusPill tone={STATUS_TONE[machine.status] || 'stone'}>
                  {t(`mst.${machine.status}`)}
                </StatusPill>
              </div>

              {machine.photo_uri && (
                <MachinePhoto
                  file_uri={machine.photo_uri}
                  alt={machine.name}
                  className="mt-4 h-36 w-full rounded-xl object-cover"
                />
              )}

              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">{t('machDialog.year')}</dt>
                  <dd className="mt-0.5 tabular-nums text-sm">{machine.year || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('mach.hours')}</dt>
                  <dd className="mt-0.5 tabular-nums text-sm">{fmtNum(machine.hours, 0)}</dd>
                </div>
              </dl>

              <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {t('mach.weightedHourly')}
                </p>
                <p className="font-display text-lg leading-tight tabular-nums">
                  {costRows[machine.id]?.hourly != null ? fmtMoney(costRows[machine.id].hourly) : '—'}
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                  {costRows[machine.id]?.hourly != null
                    ? t('mach.weightedBreakdown', {
                        maintenance: fmtMoney(costRows[machine.id].maintenance),
                        fuel: fmtMoney(costRows[machine.id].fuel),
                        hours: fmtNum(costRows[machine.id].hours, 1),
                      })
                    : t('mach.weightedNoHours')}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-end border-t border-border/60 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(machine);
                    setMachineDialog(true);
                  }}
                  className="text-[11px] font-medium text-muted-foreground hover:underline"
                >
                  {t('common.edit')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <MachineDialog
        open={machineDialog}
        onOpenChange={setMachineDialog}
        machine={editing}
        types={types}
        onTypesChanged={loadTypes}
        onSaved={load}
      />
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="font-display text-lg leading-tight tabular-nums">{value}</p>
    </div>
  );
}