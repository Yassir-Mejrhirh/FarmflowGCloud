import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Boxes, ClipboardList, Tractor, Trash2, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusPill from '@/components/StatusPill';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import UsageField from '@/components/dailyreport/UsageField';
import BlockPicker from '@/components/dailyreport/BlockPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchList, byId } from '@/lib/data';
import { fmtDate, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { natureLabel } from '@/lib/taskNature';

export default function DailyReport() {
  const { t } = useI18n();
  const [blocks, setBlocks] = useState([]);
  const [farms, setFarms] = useState([]);
  const [farmId, setFarmId] = useState('');
  const [crops, setCrops] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [items, setItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [natures, setNatures] = useState([]);
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({ date: todayISO(), block_ids: [], task_id: '', description: '', notes: '' });
  const [labour, setLabour] = useState([]);
  const [machinery, setMachinery] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [rangeError, setRangeError] = useState(null);

  const load = async () => {
    const [blockRows, farmRows, cropRows, workerRows, machineRows, itemRows, reportRows, taskRows, natureRows] = await Promise.all([
      fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
      fetchList(base44.entities.Farm, {}, { sort: 'name' }),
      fetchList(base44.entities.Crop, {}, { sort: 'name' }),
      fetchList(base44.entities.Worker, {}, { sort: 'name' }),
      fetchList(base44.entities.Machine, {}, { sort: 'name' }),
      fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
      fetchList(base44.entities.DailyReport, {}, { sort: '-date' }),
      fetchList(base44.entities.Task, {}, { sort: 'created_date' }),
      fetchList(base44.entities.TaskNature, {}, { sort: 'name' }),
    ]);
    setBlocks(blockRows);
    setFarms(farmRows);
    setCrops(cropRows);
    setWorkers(workerRows);
    setMachines(machineRows);
    setItems(itemRows);
    setReports(reportRows);
    setTasks(taskRows);
    setNatures(natureRows);
  };

  useEffect(() => {
    load();
  }, []);

  const blockMap = useMemo(() => byId(blocks), [blocks]);

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

  const machineRequired = !!taskMap[form.task_id]?.machine_required;
  const machineryReady = machinery.some((line) => line.machine_id && Number(line.hours) > 0);
  const canSubmit = form.block_ids.length > 0 && !!form.task_id && (!machineRequired || machineryReady);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.block_ids.length || !form.task_id) return;
    if (machineRequired && !machineryReady) return;

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
    const base = {
      date: form.date,
      task_id: form.task_id,
      operation: taskMap[form.task_id]?.type || 'other',
      description: form.description.trim(),
      notes: form.notes,
      labour: labour
        .filter((line) => line.worker_id && Number(line.days) > 0)
        .map((line) => ({ worker_id: line.worker_id, days: Number(line.days) })),
      machinery: machinery
        .filter((line) => line.machine_id && Number(line.hours) > 0)
        .map((line) => ({ machine_id: line.machine_id, hours: Number(line.hours) })),
      inputs: inputs
        .filter((line) => line.item_id && Number(line.quantity) > 0)
        .map((line) => ({ item_id: line.item_id, quantity: Number(line.quantity) })),
    };
    await base44.entities.DailyReport.bulkCreate(
      form.block_ids.map((blockId) => ({ ...base, block_id: blockId })),
    );
    setSaving(false);
    setForm({ ...form, block_ids: [], description: '', notes: '' });
    setLabour([]);
    setMachinery([]);
    setInputs([]);
    load();
  };

  const remove = async (report) => {
    setReports((prev) => prev.filter((row) => row.id !== report.id));
    await base44.entities.DailyReport.delete(report.id);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('report.eyebrow')}
        title={t('report.title')}
        description={t('report.description')}
      />

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
          <h2 className="font-display text-lg tracking-tight">{t('report.formTitle')}</h2>

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
          </div>

          <Field label={t('report.blocks')}>
            <BlockPicker
              groups={blockGroups}
              selected={form.block_ids}
              onChange={(ids) => {
                setRangeError(null);
                setForm({ ...form, block_ids: ids });
              }}
            />
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
            />
            <UsageField
              icon={Boxes}
              title={t('report.inputs')}
              placeholder={t('report.chooseInputs')}
              lines={inputs}
              onChange={setInputs}
              options={items.map((item) => ({ value: item.id, label: `${item.name}${item.unit ? ` (${item.unit})` : ''}` }))}
              idKey="item_id"
              qtyKey="quantity"
              qtyLabel={t('report.qty')}
              addLabel={t('report.addInput')}
              emptyLabel={t('report.noInput')}
            />
          </div>

          <Field label={t('common.notes')}>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving || !canSubmit} className="rounded-xl">
              {saving ? t('common.saving') : t('report.submit')}
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
                      onClick={() => remove(report)}
                      className="ms-auto inline-flex items-center gap-1 text-destructive hover:underline"
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
    </div>
  );
}