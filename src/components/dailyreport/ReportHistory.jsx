import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ClipboardList, History, Pencil, Trash2 } from 'lucide-react';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import ExportMenu from '@/components/ExportMenu';
import StatusPill from '@/components/StatusPill';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fetchList, byId } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { natureLabel } from '@/lib/taskNature';
import { exportExcel, exportPdf } from '@/lib/reportExport';
import { useI18n } from '@/lib/I18nContext';

// Reports already written, filtered on the server by date and farm.
export default function ReportHistory({ farms, blocks, machines, natures, refreshKey, onEdit, onDelete }) {
  const { t } = useI18n();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [farmId, setFarmId] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const blockMap = useMemo(() => byId(blocks), [blocks]);
  const machineMap = useMemo(() => byId(machines), [machines]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query = {};
    if (from) query.date = { ...(query.date || {}), $gte: from };
    if (to) query.date = { ...(query.date || {}), $lte: to };
    if (farmId) {
      const farmName = farms.find((farm) => farm.id === farmId)?.name;
      query.block_id = { $in: blocks.filter((block) => block.farm === farmName).map((block) => block.id) };
    }
    fetchList(base44.entities.DailyReport, query, { sort: '-date', limit: 60 })
      .then((items) => {
        if (!cancelled) setRows(items);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, farmId, farms, blocks, refreshKey]);

  const base = t('report.historyTitle');
  const columns = [
    { key: 'date', label: t('exp.colDate'), width: 14 },
    { key: 'block', label: t('exp.colBlock'), width: 22 },
    { key: 'operation', label: t('exp.colOperation'), width: 18 },
    { key: 'description', label: t('exp.colDescription'), width: 36 },
    { key: 'labour', label: t('report.labour'), digits: 0, align: 'end', width: 12 },
    { key: 'machinery', label: t('report.machinery'), digits: 0, align: 'end', width: 12 },
    { key: 'inputs', label: t('report.inputs'), digits: 0, align: 'end', width: 12 },
    { key: 'station', label: t('exp.colStation'), width: 18 },
    { key: 'pumpHours', label: t('exp.colPumpHours'), digits: 1, align: 'end', width: 10 },
    { key: 'water', label: t('exp.colWater'), digits: 1, align: 'end', width: 10 },
  ];
  const exportRows = rows.map((report) => ({
    date: report.date,
    block: blockMap[report.block_id]?.name || '',
    operation: natureLabel(report.operation, natures, t),
    description: report.description || '',
    labour: report.labour?.length || 0,
    machinery: report.machinery?.length || 0,
    inputs: report.inputs?.length || 0,
    station: machineMap[report.pump_station_id]?.name || '',
    pumpHours: Number(report.pump_hours) || 0,
    water: Number(report.water_m3) || 0,
  }));

  const reset = () => {
    setFrom('');
    setTo('');
    setFarmId('');
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <History className="h-4 w-4 text-clay" strokeWidth={1.8} />
          {t('report.historyTitle')}
          <span className="text-[11px] font-normal text-muted-foreground">
            {t('report.historyCount', { n: rows.length })}
          </span>
        </h2>
        <ExportMenu
          hasData={exportRows.length > 0}
          onExcel={() => exportExcel({ base, columns, rows: exportRows })}
          onPdf={() => exportPdf({ base, title: base, columns, rows: exportRows })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t('report.historyFrom')}>
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field label={t('report.historyTo')}>
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </Field>
        <Field label={t('report.farm')}>
          <SelectField
            value={farmId}
            onChange={setFarmId}
            options={farms.map((farm) => ({ value: farm.id, label: farm.name }))}
            noneLabel={t('report.allFarms')}
          />
        </Field>
        <div className="flex items-end">
          <Button type="button" variant="ghost" onClick={reset} className="h-9 rounded-xl px-3 text-xs">
            {t('report.historyReset')}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('report.historyLoading')}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('report.historyEmpty')}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((report) => (
            <li key={report.id} className="rounded-xl border border-border/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{blockMap[report.block_id]?.name || '—'}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {fmtDate(report.date)} · {blockMap[report.block_id]?.farm || '—'}
                  </p>
                </div>
                <StatusPill tone="moss">{natureLabel(report.operation, natures, t)}</StatusPill>
              </div>
              {report.description && (
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{report.description}</p>
              )}
              {(Number(report.pump_hours) > 0 || Number(report.water_m3) > 0) && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {machineMap[report.pump_station_id]?.name || t('report.pumpStation')} ·{' '}
                  {Number(report.pump_hours) || 0} H · {Number(report.water_m3) || 0} m³
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>{t('report.labourCount', { n: report.labour?.length || 0 })}</span>
                <span>{t('report.machineCount', { n: report.machinery?.length || 0 })}</span>
                <span>{t('report.inputCount', { n: report.inputs?.length || 0 })}</span>
                <button
                  type="button"
                  onClick={() => onEdit(report)}
                  className="ms-auto inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Pencil className="h-3 w-3" /> {t('common.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(report)}
                  className="inline-flex items-center gap-1 text-destructive hover:underline"
                >
                  <Trash2 className="h-3 w-3" /> {t('common.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ClipboardList className="h-3.5 w-3.5" /> {t('report.recentHint')}
      </p>
    </section>
  );
}