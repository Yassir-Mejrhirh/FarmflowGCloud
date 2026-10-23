import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Plus, Trash2, Wallet } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchList } from '@/lib/data';
import { getMonthlyCosts } from '@/lib/costs';
import { currentMonthKey, fmtDate, fmtMoney, monthLabel, todayISO } from '@/lib/format';

const CATEGORIES = [
  { value: 'labour', label: 'Labour' },
  { value: 'inputs', label: 'Inputs' },
  { value: 'machinery', label: 'Machinery' },
  { value: 'transport', label: 'Transport' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other' },
];
const BAR_COLORS = ['bg-primary', 'bg-clay', 'bg-sage', 'bg-amber-500', 'bg-muted-foreground'];

const shiftMonth = (month, delta) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export default function Costs() {
  const [month, setMonth] = useState(currentMonthKey());
  const [data, setData] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getMonthlyCosts(month),
      fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
    ]).then(([costs, blockRows]) => {
      if (!active) return;
      setData(costs);
      setBlocks(blockRows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [month, refreshKey]);

  const refresh = () => setRefreshKey((key) => key + 1);
  const total = data?.total || 0;
  const maxPart = Math.max(1, ...(data?.parts || []).map((part) => part.amount));

  const removeExpense = async (expense) => {
    await base44.entities.Expense.delete(expense.id);
    refresh();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Finance"
        title="Costs"
        description="Wages, inputs, machinery and running costs pulled together for the month."
        action={
          <Button className="rounded-xl" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add expense
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[140px] text-center text-sm font-medium">{monthLabel(month)}</span>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {month !== currentMonthKey() && (
          <button type="button" onClick={() => setMonth(currentMonthKey())} className="text-xs text-primary hover:underline">
            This month
          </button>
        )}
      </div>

      {loading || !data ? (
        <div className="h-52 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/60">Total spend</p>
              <p className="mt-2 font-display text-4xl leading-none tabular-nums">{fmtMoney(total)}</p>
              <p className="mt-3 text-xs text-primary-foreground/70">{monthLabel(month)} · all categories</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card p-6">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Where it goes</p>
              <div className="mt-4 space-y-3">
                {data.parts.map((part, index) => (
                  <div key={part.key}>
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                      <span>{part.label}</span>
                      <span className="tabular-nums text-muted-foreground">{fmtMoney(part.amount)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`}
                        style={{ width: `${Math.round((part.amount / maxPart) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="font-display text-2xl tracking-tight">Other expenses</h2>
                <p className="mt-1 text-xs text-muted-foreground">Anything not already logged as wages, inputs or service</p>
              </div>
            </div>
            {data.expenses.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No expenses this month"
                description="Add fuel, transport, utilities or any other cost against this month."
                action={<Button onClick={() => setDialogOpen(true)}>Add expense</Button>}
              />
            ) : (
              <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
                {data.expenses.map((expense) => (
                  <li key={expense.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{expense.description || 'Expense'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fmtDate(expense.date)} · {CATEGORIES.find((c) => c.value === expense.category)?.label || 'Other'}
                      </p>
                    </div>
                    <span className="text-sm tabular-nums">{fmtMoney(expense.amount)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeExpense(expense)}
                      aria-label="Delete expense"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        blocks={blocks}
        onSaved={refresh}
      />
    </div>
  );
}

function ExpenseDialog({ open, onOpenChange, blocks, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ date: todayISO(), category: 'other', amount: '', description: '', block_id: '' });
  }, [open]);

  const submit = async (event) => {
    event.preventDefault();
    if (!Number(form.amount)) return;
    setSaving(true);
    await base44.entities.Expense.create({
      date: form.date || todayISO(),
      category: form.category,
      amount: Number(form.amount),
      description: form.description || '',
      block_id: form.block_id,
    });
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add expense"
      onSubmit={submit}
      saving={saving}
      submitLabel="Save expense"
    >
      <Field label="Description">
        <Input
          value={form.description || ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Diesel refill"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount">
          <Input
            type="number"
            value={form.amount ?? ''}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
        </Field>
        <Field label="Date">
          <Input type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Category">
          <SelectField value={form.category} onChange={(value) => setForm({ ...form, category: value })} options={CATEGORIES} />
        </Field>
        <Field label="Block">
          <SelectField
            value={form.block_id}
            onChange={(value) => setForm({ ...form, block_id: value })}
            noneLabel="Farm-wide"
            options={blocks.map((block) => ({ value: block.id, label: block.name }))}
          />
        </Field>
      </div>
    </FormDialog>
  );
}