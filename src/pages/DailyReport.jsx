import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Boxes, ClipboardList, Tractor, Trash2, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusPill from '@/components/StatusPill';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import UsageEditor from '@/components/dailyreport/UsageEditor';
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
  const [workers, setWorkers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [items, setItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [natures, setNatures] = useState([]);
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({ date: todayISO(), block_id: '', task_id: '', description: '', notes: '' });
  const [labour, setLabour] = useState([]);
  const [machinery, setMachinery] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [blockRows, workerRows, machineRows, itemRows, reportRows, taskRows, natureRows] = await Promise.all([
      fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
      fetchList(base44.entities.Worker, {}, { sort: 'name' }),
      fetchList(base44.entities.Machine, {}, { sort: 'name' }),
      fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
      fetchList(base44.entities.DailyReport, {}, { sort: '-date' }),
      fetchList(base44.entities.Task, {}, { sort: 'created_date' }),
      fetchList(base44.entities.TaskNature, {}, { sort: 'name' }),
    ]);
    setBlocks(blockRows);
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
  const taskMap = useMemo(() => byId(tasks), [tasks]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.block_id || !form.task_id) return;
    setSaving(true);
    await base44.entities.DailyReport.create({
      date: form.date,
      block_id: form.block_id,
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
    });
    setSaving(false);
    setForm({ ...form, description: '', notes: '' });
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
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </Field>
            <Field label={t('report.block')}>
              <SelectField
                value={form.block_id}
                onChange={(value) => setForm({ ...form, block_id: value })}
                options={blocks.map((block) => ({ value: block.id, label: block.name }))}
              />
            </Field>
          </div>

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
            <UsageEditor
              icon={Users}
              title={t('report.labour')}
              lines={labour}
              onChange={setLabour}
              options={workers.map((worker) => ({ value: worker.id, label: worker.name }))}
              idKey="worker_id"
              qtyKey="days"
              qtyLabel={t('report.days')}
              addLabel={t('report.addLabour')}
              emptyLabel={t('report.noLabour')}
            />
            <UsageEditor
              icon={Tractor}
              title={t('report.machinery')}
              lines={machinery}
              onChange={setMachinery}
              options={machines.map((machine) => ({ value: machine.id, label: machine.name }))}
              idKey="machine_id"
              qtyKey="hours"
              qtyLabel={t('report.hours')}
              addLabel={t('report.addMachine')}
              emptyLabel={t('report.noMachine')}
            />
            <UsageEditor
              icon={Boxes}
              title={t('report.inputs')}
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

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving || !form.block_id || !form.task_id} className="rounded-xl">
              {saving ? t('common.saving') : t('report.submit')}
            </Button>
            {(!form.block_id || !form.task_id) && (
              <span className="text-[11px] text-muted-foreground">{t('report.needBlock')}</span>
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