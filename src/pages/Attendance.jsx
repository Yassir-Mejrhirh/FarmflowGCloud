import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, CheckCircle2, ClipboardList, FileSpreadsheet } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import DayField from '@/components/labour/DayField';
import PointageWorkerList from '@/components/attendance/PointageWorkerList';
import AttendanceImportDialog from '@/components/attendance/AttendanceImportDialog';
import ImportHistory from '@/components/attendance/ImportHistory';
import ReconcileQueue from '@/components/reconcile/ReconcileQueue';
import { integrateQueueItem } from '@/lib/attendanceReconcile';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/data';
import { fmtNum, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { attendanceGroups } from '@/lib/attendance';
import { cn } from '@/lib/utils';

// Pointage of the day for one farm: the days worked by each worker are kept on one
// sheet per date and per farm, and the daily report proposes them afterwards.
export default function Attendance() {
  const { t } = useI18n();
  const [date, setDate] = useState(todayISO());
  const [farmId, setFarmId] = useState('');
  const [farms, setFarms] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [days, setDays] = useState({});
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [imports, setImports] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);

  const loadLists = async () => {
    const [farmRows, workerRows] = await Promise.all([
      fetchList(base44.entities.Farm, {}, { sort: 'name' }),
      fetchList(base44.entities.Worker, {}, { sort: 'name' }),
    ]);
    setFarms(farmRows);
    setWorkers(workerRows.filter((worker) => worker.active !== false));
  };

  const loadImports = async () => {
    setHistoryLoading(true);
    try {
      const rows = await fetchList(base44.entities.AttendanceImport, {}, { sort: '-created_date', limit: 30 });
      setImports(rows);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Liste d'attente des pointages rapprochés, tenue par la section de rapprochement.
  const loadQueue = async () => {
    setQueueLoading(true);
    try {
      const rows = await fetchList(base44.entities.AttendanceReconciliation, {}, { sort: '-created_date', limit: 20 });
      setQueue(rows);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    loadLists();
    loadImports();
    loadQueue();
  }, []);

  // Intégration d'un pointage rapproché : il devient un pointage du jour.
  const integrateReconciliation = async (item) => {
    const result = await integrateQueueItem(item);
    await loadQueue();
    setRefreshToken((token) => token + 1);
    return result;
  };

  const deleteReconciliation = async (item) => {
    await base44.entities.AttendanceReconciliation.delete(item.id);
    await loadQueue();
  };

  // Retire l'import de l'historique ; les feuilles de pointage qu'il a écrites restent.
  const deleteImport = async (id) => {
    await base44.entities.AttendanceImport.delete(id);
    await loadImports();
  };

  // Supprime les pointages écrits par un import, puis l'import lui-même.
  const deleteImportSheets = async (entry) => {
    const results = await Promise.allSettled(
      (entry.sheets || []).map((sheet) =>
        base44.entities.AttendanceSheet.deleteMany({ date: sheet.date, farm_id: sheet.farm_id }),
      ),
    );
    const failed = results.some((result) => result.status === 'rejected');
    if (!failed) await base44.entities.AttendanceImport.delete(entry.id);
    await loadImports();
    // La feuille affichée est rechargée : elle reflète les pointages réellement supprimés.
    setRefreshToken((token) => token + 1);
    if (failed) throw new Error('sheets');
  };

  // Rouvre un import : sa première feuille donne la date et la ferme à afficher.
  const openImport = (entry) => {
    const first = (entry.sheets || [])[0];
    if (!first) return;
    setDate(first.date);
    setFarmId(first.farm_id);
  };

  useEffect(() => {
    if (!farmId && farms.length) setFarmId(farms[0].id);
  }, [farms, farmId]);

  const farmName = farms.find((farm) => farm.id === farmId)?.name || '';

  useEffect(() => {
    if (!date || !farmId) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setMessage(null);
    setSheet(null);
    setDays({});
    fetchList(base44.entities.AttendanceSheet, { date, farm_id: farmId }, { sort: '-updated_date', limit: 1 })
      .then((rows) => {
        if (!active) return;
        const found = rows[0] || null;
        setSheet(found);
        const next = {};
        (found?.lines || []).forEach((line) => {
          if (line.worker_id) next[line.worker_id] = String(line.days ?? '');
        });
        setDays(next);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [date, farmId, refreshToken]);

  const groups = useMemo(() => attendanceGroups(workers, farmName, t), [workers, farmName, t]);

  const setWorkerDays = (workerId, value) => {
    setDays((prev) => ({ ...prev, [workerId]: value }));
    setMessage(null);
  };

  const fillGroup = (list) => {
    setDays((prev) => {
      const next = { ...prev };
      list.forEach((worker) => {
        next[worker.id] = '1';
      });
      return next;
    });
    setMessage(null);
  };

  const clearGroup = (list) => {
    setDays((prev) => {
      const next = { ...prev };
      list.forEach((worker) => {
        next[worker.id] = '';
      });
      return next;
    });
    setMessage(null);
  };

  const lines = Object.entries(days)
    .map(([worker_id, value]) => ({ worker_id, days: Number(value) || 0 }))
    .filter((line) => line.days > 0);
  const totalDays = lines.reduce((sum, line) => sum + line.days, 0);

  const save = async () => {
    if (!date || !farmId) return;
    setSaving(true);
    setMessage(null);
    try {
      if (!lines.length) {
        if (sheet) await base44.entities.AttendanceSheet.delete(sheet.id);
        setSheet(null);
        setMessage({ tone: 'muted', key: 'att.none' });
      } else {
        const body = { date, farm_id: farmId, farm_name: farmName, lines, total_days: totalDays };
        const row = sheet
          ? await base44.entities.AttendanceSheet.update(sheet.id, body)
          : await base44.entities.AttendanceSheet.create(body);
        setSheet(row);
        setMessage({ tone: 'success', key: 'att.saved' });
      }
    } catch (error) {
      setMessage({ tone: 'error', key: 'att.error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('att.eyebrow')}
        title={t('att.title')}
        description={t('att.description')}
        action={
          <>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/attendance-reconciliation">
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                {t('rec.title')}
              </Link>
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" />
              {t('aimport.button')}
            </Button>
          </>
        }
      />

      <section className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('att.date')}>
            <DayField value={date} onChange={setDate} />
          </Field>
          <Field label={t('att.farm')}>
            <SelectField
              value={farmId}
              onChange={setFarmId}
              options={farms.map((farm) => ({ value: farm.id, label: farm.name }))}
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" strokeWidth={1.8} />
            {t('att.summary', { n: lines.length, days: fmtNum(totalDays, 1) })}
          </span>
          {sheet && !loading && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {t('att.exists')}
            </span>
          )}
          <Button
            type="button"
            onClick={save}
            disabled={saving || loading || !farmId}
            className="ms-auto rounded-xl"
          >
            <CheckCircle2 className="h-4 w-4" />
            {saving ? t('common.saving') : t('att.save')}
          </Button>
        </div>
        {message && (
          <p
            className={cn(
              'mt-3 rounded-xl border px-3 py-2 text-[12px] leading-relaxed',
              message.tone === 'success'
                ? 'border-primary/30 bg-primary/5 text-primary'
                : message.tone === 'error'
                  ? 'border-destructive/30 bg-destructive/5 text-destructive'
                  : 'border-border bg-muted/20 text-muted-foreground',
            )}
          >
            {t(message.key)}
          </p>
        )}
      </section>

      <ReconcileQueue
        items={queue}
        loading={queueLoading}
        onIntegrate={integrateReconciliation}
        onDelete={deleteReconciliation}
        defaultCollapsed
      />

      <ImportHistory
        imports={imports}
        loading={historyLoading}
        onOpen={openImport}
        onDelete={deleteImport}
        onDeleteSheets={deleteImportSheets}
      />

      {loading ? (
        <p className="rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
          {t('att.loading')}
        </p>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground">{t('att.mobileHint')}</p>
          <PointageWorkerList
            groups={groups}
            days={days}
            onChange={setWorkerDays}
            onFillGroup={fillGroup}
            onClearGroup={clearGroup}
          />
        </>
      )}

      <AttendanceImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        farms={farms}
        workers={workers}
        onImported={() => {
          loadLists();
          loadImports();
          setRefreshToken((token) => token + 1);
        }}
      />
    </div>
  );
}