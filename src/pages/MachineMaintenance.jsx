import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Pencil, Plus, Trash2, Wrench } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import MaintenanceLogDialog from '@/components/machinery/MaintenanceLogDialog';
import { fetchList, byId } from '@/lib/data';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function MachineMaintenance() {
  const { t } = useI18n();
  const [machines, setMachines] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [machineRows, logRows] = await Promise.all([
      fetchList(base44.entities.Machine, {}, { sort: 'name' }),
      fetchList(base44.entities.MaintenanceLog, {}, { sort: '-date' }),
    ]);
    setMachines(machineRows);
    setLogs(logRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const machineMap = useMemo(() => byId(machines), [machines]);
  const totalCost = logs.reduce((sum, log) => sum + (Number(log.cost) || 0), 0);

  const remove = async (log) => {
    setLogs((prev) => prev.filter((row) => row.id !== log.id));
    await base44.entities.MaintenanceLog.delete(log.id);
  };

  const openNew = () => {
    setEditing(null);
    setDialog(true);
  };

  const openEdit = (log) => {
    setEditing(log);
    setDialog(true);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('maint.eyebrow')}
        title={t('maint.title')}
        description={t('maint.description')}
        action={
          <Button className="rounded-xl" onClick={openNew} disabled={machines.length === 0}>
            <Plus className="mr-1.5 h-4 w-4" /> {t('maint.new')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard icon={Wrench} label={t('maint.operations')} value={logs.length} tone="moss" />
        <StatCard icon={Wrench} label={t('maint.spend')} value={fmtMoney(totalCost)} tone="clay" />
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={machines.length === 0 ? t('mach.emptyTitle') : t('maint.emptyTitle')}
          description={machines.length === 0 ? t('mach.emptyDesc') : t('maint.emptyDesc')}
          action={machines.length > 0 ? <Button onClick={openNew}>{t('maint.new')}</Button> : null}
        />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {logs.map((log) => (
            <li key={log.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {machineMap[log.machine_id]?.name || t('mach.unknown')}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {fmtDate(log.date)} · {t(`mk.${log.kind}`)}
                  {log.description ? ` · ${log.description}` : ''}
                </p>
                {Number(log.hours_reading) > 0 && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {t('maintDialog.hoursReading')} : {fmtNum(log.hours_reading, 0)} h
                  </p>
                )}
              </div>
              <span className="text-sm tabular-nums">{fmtMoney(log.cost)}</span>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => openEdit(log)}
                  aria-label={t('common.edit')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(log)}
                  aria-label={t('common.deleteEntry')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MaintenanceLogDialog
        open={dialog}
        onOpenChange={setDialog}
        log={editing}
        machines={machines}
        onSaved={load}
      />
    </div>
  );
}