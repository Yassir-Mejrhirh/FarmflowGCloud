import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ClipboardList, Pencil, Tractor, Trash2, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusPill from '@/components/StatusPill';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import UsageField from '@/components/dailyreport/UsageField';
import InputStockNote from '@/components/dailyreport/InputStockNote';
import FuelLine from '@/components/dailyreport/FuelLine';
import OtherInputsPanel from '@/components/dailyreport/OtherInputsPanel';
import StockShortageAlert from '@/components/stock/StockShortageAlert';
import { aggregateQuantities, findShortages } from '@/lib/stockGuard';
import { buildOnHand } from '@/lib/inventory';
import { buildReportMovements, buildReportOutflow } from '@/lib/reportStock';
import { applyReportHours, reportHoursByMachine } from '@/lib/machineCounter';
import { buildEditDraft, entryReports } from '@/lib/reportDraft';
import ReportEditDialog from '@/components/dailyreport/ReportEditDialog';
import { isMachineConsumableItem } from '@/lib/machineryCosts';
import BlockPicker from '@/components/dailyreport/BlockPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchList, byId } from '@/lib/data';
import { fmtDate, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { natureLabel } from '@/lib/taskNature';
import ExportMenu from '@/components/ExportMenu';
import { exportExcel, exportPdf } from '@/lib/reportExport';
import { buildRateIndex, labourRate } from '@/lib/wageRates';
import LabourRateNote from '@/components/dailyreport/LabourRateNote';

export default function DailyReport() {
  const { t } = useI18n();
  const [blocks, setBlocks] = useState([]);
  const [farms, setFarms] = useState([]);
  const [farmId, setFarmId] = useState('');
  const [crops, setCrops] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [movements, setMovements] = useState([]);
  const [counts, setCounts] = useState([]);
  const [storages, setStorages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [natures, setNatures] = useState([]);
  const [reports, setReports] = useState([]);
  const [wageRates, setWageRates] = useState([]);
  const [form, setForm] = useState({ date: todayISO(), block_ids: [], task_id: '', description: '', notes: '' });
  const [labour, setLabour] = useState([]);
  const [machinery, setMachinery] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [rangeError, setRangeError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editChoice, setEditChoice] = useState(null);

  const load = async () => {
    const [blockRows, farmRows, cropRows, workerRows, machineRows, itemRows, invoiceRows, movementRows, countRows, storageRows, reportRows, taskRows, natureRows, wageRateRows] = await Promise.all([
      fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
      fetchList(base44.entities.Farm, {}, { sort: 'name' }),
      fetchList(base44.entities.Crop, {}, { sort: 'name' }),
      fetchList(base44.entities.Worker, {}, { sort: 'name' }),
      fetchList(base44.entities.Machine, {}, { sort: 'name' }),
      fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
      fetchList(base44.entities.InputInvoice, {}),
      fetchList(base44.entities.StockMovement, {}),
      fetchList(base44.entities.InventoryCount, {}, { sort: '-date' }),
      fetchList(base44.entities.Storage, {}, { sort: 'name' }),
      fetchList(base44.entities.DailyReport, {}, { sort: '-date' }),
      fetchList(base44.entities.Task, {}, { sort: 'created_date' }),
      fetchList(base44.entities.TaskNature, {}, { sort: 'name' }),
      fetchList(base44.entities.WageRate, {}),
    ]);
    setBlocks(blockRows);
    setFarms(farmRows);
    setCrops(cropRows);
    setWorkers(workerRows);
    setMachines(machineRows);
    setItems(itemRows);
    setInvoices(invoiceRows);
    setMovements(movementRows);
    setCounts(countRows);
    setStorages(storageRows);
    setReports(reportRows);
    setTasks(taskRows);
    setNatures(natureRows);
    setWageRates(wageRateRows);
  };

  useEffect(() => {
    load();
  }, []);

  const blockMap = useMemo(() => byId(blocks), [blocks]);
  const workerMap = useMemo(() => byId(workers), [workers]);
  // Rates are looked up at the date of the report, so a revision only applies to later reports.
  const rateIndex = useMemo(() => buildRateIndex(wageRates), [wageRates]);

  // The resources are entered once for the whole report and shared between the
  // selected parcels in proportion to their area in hectares.
  const shares = useMemo(() => {
    const selected = form.block_ids.map((id) => blockMap[id]).filter(Boolean);
    const areas = selected.map((block) => Number(block.area_ha) || 0);
    const totalArea = areas.reduce((sum, area) => sum + area, 0);
    return selected.map((block, index) => ({
      block,
      weight: totalArea > 0 ? areas[index] / totalArea : 1 / (selected.length || 1),
    }));
  }, [form.block_ids, blockMap]);

  const farmName = farms.find((farm) => farm.id === farmId)?.name;
  const visibleBlocks = useMemo(
    () => (farmName ? blocks.filter((block) => block.farm === farmName) : blocks),
    [blocks, farmName],
  );

  const blockGroups = useMemo(() => {
    const cropMap = byId(crops);
    const groups = new Map();
    visibleBlocks.forEach((block) => {
      const crop = cropMap[block.crop_id];
      const key = crop ? crop.id : 'none';
      if (!groups.has(key)) {
        groups.set(key, { key, label: crop ? crop.name : t('report.noCrop'), blocks: [] });
      }
      groups.get(key).blocks.push(block);
    });
    return [...groups.values()].sort((a, b) =>
      a.key === 'none' ? 1 : b.key === 'none' ? -1 : a.label.localeCompare(b.label),
    );
  }, [visibleBlocks, crops, t]);
  const taskMap = useMemo(() => byId(tasks), [tasks]);
  const itemMap = useMemo(() => byId(items), [items]);
  const machineMap = useMemo(() => byId(machines), [machines]);
  const stockTotals = useMemo(
    () => buildOnHand(invoices, movements, counts),
    [invoices, movements, counts],
  );
  const outflow = useMemo(() => buildReportOutflow(inputs, machinery), [inputs, machinery]);
  const itemOption = (item) => ({ value: item.id, label: `${item.name}${item.unit ? ` (${item.unit})` : ''}` });
  // Fuel and lubricants are entered on the machine that consumed them: they are
  // listed here only so the refusal can be explained, and are kept at the end.
  const otherInputOptions = useMemo(
    () => [...items]
      .sort((a, b) => Number(isMachineConsumableItem(a)) - Number(isMachineConsumableItem(b)))
      .map(itemOption),
    [items],
  );
  const blockedInputs = useMemo(
    () => inputs.filter((line) => line.item_id && isMachineConsumableItem(itemMap[line.item_id])),
    [inputs, itemMap],
  );

  const machineRequired = !!taskMap[form.task_id]?.machine_required;
  const machineryReady = machinery.some((line) => line.machine_id && Number(line.hours) > 0);
  // A reopened report replaces its own movements: those quantities come back into
  // the available stock before the new amounts are checked against it.
  const replaced = useMemo(() => {
    const totals = new Map();
    if (!editing) return totals;
    const ids = new Set(editing.rows.map((row) => row.id));
    movements
      .filter((movement) => ids.has(movement.report_id) && movement.kind !== 'in')
      .forEach((movement) => {
        totals.set(movement.item_id, (totals.get(movement.item_id) || 0) + (Number(movement.quantity) || 0));
      });
    return totals;
  }, [editing, movements]);
  const shortages = useMemo(
    () =>
      findShortages(
        aggregateQuantities(outflow),
        (itemId) => (stockTotals[itemId]?.quantity || 0) + (replaced.get(itemId) || 0),
      ),
    [outflow, stockTotals, replaced],
  );
  const stockExceeded = shortages.length > 0;
  const canSubmit =
    form.block_ids.length > 0 &&
    !!form.task_id &&
    (!machineRequired || machineryReady) &&
    !stockExceeded &&
    blockedInputs.length === 0;

  const submit = async (event) => {
    event.preventDefault();
    if (!form.block_ids.length || !form.task_id) return;
    if (machineRequired && !machineryReady) return;
    if (stockExceeded) return;
    if (blockedInputs.length) return;

    for (const id of form.block_ids) {
      const block = blockMap[id];
      if (block?.planting_date && form.date < block.planting_date) {
        setRangeError({ key: 'report.outOfRangeBefore', date: fmtDate(block.planting_date) });
        return;
      }
      if (block?.crop_end_date && form.date > block.crop_end_date) {
        setRangeError({ key: 'report.outOfRangeAfter', date: fmtDate(block.crop_end_date) });
        return;
      }
    }

    setRangeError(null);
    setSaving(true);
    // The hours, days and inputs are entered once for the whole report: they are
    // shared between the parcels in proportion to their area in hectares. The fuel
    // stays whole on the machine, which the hourly cost then spreads by hours.
    const payloadFor = (weight) => {
      const share = (value) => Math.round((Number(value) || 0) * weight * 1000) / 1000;
      return {
        date: form.date,
        task_id: form.task_id,
        operation: taskMap[form.task_id]?.type || 'other',
        description: form.description.trim(),
        notes: form.notes,
        labour: labour
          .filter((line) => line.worker_id && Number(line.days) > 0)
          .map((line) => ({
            worker_id: line.worker_id,
            days: share(line.days),
            // The rate is frozen on the line: later revisions never change this report's cost.
            daily_rate: labourRate(line, workerMap[line.worker_id], rateIndex, form.date),
          })),
        machinery: machinery
          .filter((line) => line.machine_id && Number(line.hours) > 0)
          .map((line) => ({ machine_id: line.machine_id, hours: share(line.hours) })),
        inputs: inputs
          .filter((line) => line.item_id && Number(line.quantity) > 0)
          .map((line) => ({ item_id: line.item_id, quantity: share(line.quantity) })),
      };
    };
    const weights = new Map(shares.map((row) => [row.block.id, row.weight]));
    const entryId = `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const writtenRows = editing
      ? await Promise.all(
          editing.rows.map((report) =>
            base44.entities.DailyReport.update(report.id, {
              ...payloadFor(weights.get(report.block_id) ?? 1),
              block_id: report.block_id,
            }),
          ),
        )
      : await Promise.all(
          shares.map((row) =>
            base44.entities.DailyReport.create({
              ...payloadFor(row.weight),
              block_id: row.block.id,
              group_id: entryId,
            }),
          ),
        );

    if (editing) {
      // The movements generated by the reopened reports are replaced, never added to.
      await Promise.all(
        editing.rows.map((report) => base44.entities.StockMovement.deleteMany({ report_id: report.id })),
      );
    }

    if (outflow.length) {
      // A reopened report keeps its identity, so its movements point at the same rows.
      const movementRows = editing ? editing.rows : writtenRows;
      await base44.entities.StockMovement.bulkCreate(
        buildReportMovements({
          rows: movementRows,
          outflow,
          weights,
          farmOf: (blockId) => blockMap[blockId]?.farm,
          storages,
          invoices,
          date: form.date,
          notes: form.description.trim(),
        }),
      );
    }

    // The hours written for each machine add to its counter: a revised report only
    // moves it by the difference, so replaying an entry never counts twice.
    await applyReportHours({
      machines,
      added: reportHoursByMachine(writtenRows),
      removed: editing ? reportHoursByMachine(editing.rows) : null,
    });

    setSaving(false);
    cancelEdit();
    load();
  };

  const startEdit = (rows) => {
    const draft = buildEditDraft(rows, movements, items);
    setForm({
      date: draft.date,
      task_id: draft.task_id,
      description: draft.description,
      notes: draft.notes,
      block_ids: rows.map((row) => row.block_id),
    });
    setLabour(draft.labour);
    setMachinery(draft.machinery);
    setInputs(draft.inputs);
    setEditing({ rows });
    setEditChoice(null);
    setRangeError(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ date: todayISO(), block_ids: [], task_id: '', description: '', notes: '' });
    setLabour([]);
    setMachinery([]);
    setInputs([]);
    setRangeError(null);
  };

  // One report can stand for a whole entry: the scope is chosen before the form fills.
  const openEdit = (report) => {
    const group = entryReports(reports, report);
    if (group.length > 1) {
      setEditChoice({ report, group });
      return;
    }
    startEdit([report]);
  };

  const remove = async (report) => {
    setReports((prev) => prev.filter((row) => row.id !== report.id));
    setMovements((prev) => prev.filter((row) => row.report_id !== report.id));
    await base44.entities.StockMovement.deleteMany({ report_id: report.id });
    await applyReportHours({ machines, removed: reportHoursByMachine([report]) });
    await base44.entities.DailyReport.delete(report.id);
    const [movementRows, reportRows] = await Promise.all([
      fetchList(base44.entities.StockMovement, {}),
      fetchList(base44.entities.DailyReport, {}, { sort: '-date' }),
    ]);
    setMovements(movementRows);
    setReports(reportRows);
  };

  const exportBase = t('report.recent');
  const exportColumns = [
    { key: 'date', label: t('exp.colDate'), width: 14 },
    { key: 'block', label: t('exp.colBlock'), width: 22 },
    { key: 'operation', label: t('exp.colOperation'), width: 18 },
    { key: 'description', label: t('exp.colDescription'), width: 36 },
    { key: 'labour', label: t('report.labour'), digits: 0, align: 'end', width: 12 },
    { key: 'machinery', label: t('report.machinery'), digits: 0, align: 'end', width: 12 },
    { key: 'inputs', label: t('report.inputs'), digits: 0, align: 'end', width: 12 },
  ];
  const exportRows = reports.map((report) => ({
    date: report.date,
    block: blockMap[report.block_id]?.name || '',
    operation: natureLabel(report.operation, natures, t),
    description: report.description || '',
    labour: report.labour?.length || 0,
    machinery: report.machinery?.length || 0,
    inputs: report.inputs?.length || 0,
  }));
  const runExcel = () => exportExcel({ base: exportBase, columns: exportColumns, rows: exportRows });
  const runPdf = () =>
    exportPdf({ base: exportBase, title: exportBase, columns: exportColumns, rows: exportRows });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('report.eyebrow')}
        title={t('report.title')}
        description={t('report.description')}
        action={<ExportMenu hasData={exportRows.length > 0} onExcel={runExcel} onPdf={runPdf} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg tracking-tight">
              {editing ? t('report.editTitle') : t('report.formTitle')}
            </h2>
            {editing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-[11px] text-muted-foreground hover:underline"
              >
                {t('report.cancelEdit')}
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('report.date')}>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => {
                  setRangeError(null);
                  setForm({ ...form, date: e.target.value });
                }}
                required
              />
              {rangeError && (
                <p className="mt-1.5 text-[11px] font-medium text-destructive">
                  {t(rangeError.key, { date: rangeError.date })}
                </p>
              )}
            </Field>
            {!editing && (
              <Field label={t('report.farm')}>
                <SelectField
                  value={farmId}
                  onChange={(value) => {
                    setRangeError(null);
                    setFarmId(value);
                    const name = farms.find((farm) => farm.id === value)?.name;
                    const kept = name
                      ? form.block_ids.filter((id) => blockMap[id]?.farm === name)
                      : form.block_ids;
                    if (kept.length !== form.block_ids.length) {
                      setForm({ ...form, block_ids: kept });
                    }
                  }}
                  options={farms.map((farm) => ({ value: farm.id, label: farm.name }))}
                  noneLabel={t('report.allFarms')}
                />
              </Field>
            )}
          </div>

          <Field label={t('report.blocks')}>
            {editing ? (
              <>
                <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                  {shares.map((row) => row.block.name).join(' · ') || '—'}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{t('report.blocksLocked')}</p>
              </>
            ) : (
              <>
                <BlockPicker
                  groups={blockGroups}
                  selected={form.block_ids}
                  onChange={(ids) => {
                    setRangeError(null);
                    setForm({ ...form, block_ids: ids });
                  }}
                />
                {shares.length > 1 && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {t('report.areaShare')} ·{' '}
                    {shares.map((row) => `${row.block.name} ${Math.round(row.weight * 100)}%`).join(' · ')}
                  </p>
                )}
              </>
            )}
          </Field>

          <Field label={t('report.task')}>
            <SelectField
              value={form.task_id}
              onChange={(value) => setForm({ ...form, task_id: value })}
              options={tasks.map((task) => ({
                value: task.id,
                label: natureLabel(task.type, natures, t),
              }))}
            />
            {tasks.length === 0 && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">{t('report.noTask')}</p>
            )}
          </Field>

          <Field label={t('report.descLabel')}>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder={t('report.descPlaceholder')}
            />
          </Field>

          <div className="space-y-2">
            <UsageField
              icon={Users}
              title={t('report.labour')}
              placeholder={t('report.chooseLabour')}
              lines={labour}
              onChange={setLabour}
              options={workers.map((worker) => ({ value: worker.id, label: worker.name }))}
              idKey="worker_id"
              qtyKey="days"
              qtyLabel={t('report.days')}
              addLabel={t('report.addLabour')}
              emptyLabel={t('report.noLabour')}
              renderMeta={(line) => (
                <LabourRateNote
                  line={line}
                  worker={workerMap[line.worker_id]}
                  rateIndex={rateIndex}
                  date={form.date}
                />
              )}
            />
            <UsageField
              icon={Tractor}
              title={t('report.machinery')}
              placeholder={t('report.chooseMachinery')}
              lines={machinery}
              onChange={setMachinery}
              options={machines.map((machine) => ({ value: machine.id, label: machine.name }))}
              idKey="machine_id"
              qtyKey="hours"
              qtyLabel={t('report.hours')}
              addLabel={t('report.addMachine')}
              emptyLabel={t('report.noMachine')}
              pickExtras={() => ({
                fuel_item_id: '',
                fuel_quantity: '',
                lubricant_item_id: '',
                lubricant_quantity: '',
              })}
              renderMeta={(line, patch) => (
                <FuelLine line={line} patch={patch} machine={machineMap[line.machine_id]} items={items} />
              )}
            />
            {machineryReady && (
              <p className="ps-1 text-[11px] text-muted-foreground">{t('report.fuelHint')}</p>
            )}
            <OtherInputsPanel
              lines={inputs}
              onChange={setInputs}
              options={otherInputOptions}
              items={items}
              renderMeta={(line) => (
                <InputStockNote
                  item={itemMap[line.item_id]}
                  stock={stockTotals[line.item_id]?.quantity || 0}
                  used={Number(line.quantity) || 0}
                />
              )}
            />
          </div>

          <Field label={t('common.notes')}>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </Field>

          <StockShortageAlert shortages={shortages} items={items} />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving || !canSubmit} className="rounded-xl">
              {saving ? t('common.saving') : editing ? t('report.update') : t('report.submit')}
            </Button>
            {(!form.block_ids.length || !form.task_id) && (
              <span className="text-[11px] text-muted-foreground">{t('report.needBlock')}</span>
            )}
            {machineRequired && !machineryReady && (
              <span className="text-[11px] font-medium text-destructive">{t('report.machineRequired')}</span>
            )}
          </div>
        </form>

        <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
          <h2 className="font-display text-lg tracking-tight">{t('report.recent')}</h2>
          {reports.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t('report.recentEmpty')}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {reports.slice(0, 12).map((report) => (
                <li key={report.id} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{blockMap[report.block_id]?.name || '—'}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {fmtDate(report.date)}
                      </p>
                    </div>
                    <StatusPill tone="moss">{natureLabel(report.operation, natures, t)}</StatusPill>
                  </div>
                  {report.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{report.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{t('report.labourCount', { n: report.labour?.length || 0 })}</span>
                    <span>{t('report.machineCount', { n: report.machinery?.length || 0 })}</span>
                    <span>{t('report.inputCount', { n: report.inputs?.length || 0 })}</span>
                    <button
                      type="button"
                      onClick={() => openEdit(report)}
                      className="ms-auto inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <Pencil className="h-3 w-3" /> {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(report)}
                      className="inline-flex items-center gap-1 text-destructive hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> {t('common.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" /> {t('report.recentHint')}
          </p>
        </section>
      </div>

      <ReportEditDialog
        open={!!editChoice}
        count={editChoice?.group.length || 0}
        onClose={() => setEditChoice(null)}
        onSingle={() => startEdit(editChoice.group.filter((row) => row.id === editChoice.report.id))}
        onGroup={() => startEdit(editChoice.group)}
      />
    </div>
  );
}