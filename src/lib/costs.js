import { base44 } from '@/api/base44Client';
import { monthRange } from '@/lib/format';
import { fetchList, sumBy } from '@/lib/data';

export async function getMonthlyCosts(monthKey) {
  const { start, end } = monthRange(monthKey);
  const range = { $gte: start, $lt: end };

  const [expenses, attendance, maintenance, tasks, purchases] = await Promise.all([
    fetchList(base44.entities.Expense, { date: range }, { sort: '-date' }),
    fetchList(base44.entities.Attendance, { date: range }, { sort: '-date' }),
    fetchList(base44.entities.MaintenanceLog, { date: range }, { sort: '-date' }),
    fetchList(base44.entities.Task, { completed_date: range }),
    fetchList(base44.entities.StockMovement, { date: range, kind: 'in' }, { sort: '-date' }),
  ]);

  const parts = [
    { key: 'labour', label: 'Wages logged', amount: sumBy(attendance, 'amount') },
    { key: 'inputs', label: 'Input purchases', amount: sumBy(purchases, 'cost') },
    { key: 'machinery', label: 'Machinery service', amount: sumBy(maintenance, 'cost') },
    { key: 'tasks', label: 'Task costs', amount: sumBy(tasks, 'actual_cost') },
    { key: 'other', label: 'Other expenses', amount: sumBy(expenses, 'amount') },
  ];

  return {
    parts,
    total: parts.reduce((total, part) => total + part.amount, 0),
    expenses,
    attendance,
    maintenance,
    purchases,
  };
}