import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/data';

const lineUses = (lines, field, value) => (lines || []).some((line) => line?.[field] === value);

// Références opérationnelles de chaque section de paramétrage.
const CHECKS = {
  InputItem: [
    { entity: 'InputInvoice', key: 'usage.invoices', match: (row, record) => lineUses(row.lines, 'item_id', record.id) },
    { entity: 'StockMovement', key: 'usage.movements', match: (row, record) => row.item_id === record.id },
    { entity: 'InventoryCount', key: 'usage.counts', match: (row, record) => lineUses(row.lines, 'item_id', record.id) },
    {
      entity: 'DailyReport',
      key: 'usage.reports',
      match: (row, record) =>
        lineUses(row.inputs, 'item_id', record.id) ||
        (row.machinery || []).some(
          (line) => line.fuel_item_id === record.id || line.lubricant_item_id === record.id,
        ),
    },
    { entity: 'MaintenanceLog', key: 'usage.maintenance', match: (row, record) => lineUses(row.parts, 'item_id', record.id) },
  ],
  Storage: [
    { entity: 'InputInvoice', key: 'usage.invoices', match: (row, record) => row.storage_id === record.id },
    { entity: 'StockMovement', key: 'usage.movements', match: (row, record) => row.storage_id === record.id },
    { entity: 'InventoryCount', key: 'usage.counts', match: (row, record) => row.storage_id === record.id },
    { entity: 'MaintenanceLog', key: 'usage.maintenance', match: (row, record) => row.storage_id === record.id },
  ],
  Worker: [
    { entity: 'DailyReport', key: 'usage.reports', match: (row, record) => lineUses(row.labour, 'worker_id', record.id) },
    { entity: 'Attendance', key: 'usage.attendance', match: (row, record) => row.worker_id === record.id },
  ],
  Machine: [
    { entity: 'DailyReport', key: 'usage.reports', match: (row, record) => lineUses(row.machinery, 'machine_id', record.id) },
    { entity: 'MaintenanceLog', key: 'usage.maintenance', match: (row, record) => row.machine_id === record.id },
    { entity: 'StockMovement', key: 'usage.movements', match: (row, record) => row.machine_id === record.id },
    { entity: 'Expense', key: 'usage.expenses', match: (row, record) => row.machine_id === record.id },
  ],
  Farm: [
    { entity: 'FarmBlock', key: 'usage.blocks', match: (row, record) => row.farm === record.name },
    { entity: 'Storage', key: 'usage.storages', match: (row, record) => row.farm === record.name },
    { entity: 'Worker', key: 'usage.workers', match: (row, record) => row.farm === record.name },
  ],
  FarmBlock: [
    { entity: 'DailyReport', key: 'usage.reports', match: (row, record) => row.block_id === record.id },
    { entity: 'Harvest', key: 'usage.harvests', match: (row, record) => row.block_id === record.id },
    { entity: 'Task', key: 'usage.tasks', match: (row, record) => row.block_id === record.id },
    { entity: 'StockMovement', key: 'usage.movements', match: (row, record) => row.block_id === record.id },
    { entity: 'Expense', key: 'usage.expenses', match: (row, record) => row.block_id === record.id },
  ],
  Crop: [
    { entity: 'FarmBlock', key: 'usage.blocks', match: (row, record) => row.crop_id === record.id },
    { entity: 'Variety', key: 'usage.varieties', match: (row, record) => row.crop_id === record.id },
    { entity: 'Task', key: 'usage.tasks', match: (row, record) => row.crop_id === record.id },
  ],
  Variety: [
    {
      entity: 'FarmBlock',
      key: 'usage.blocks',
      match: (row, record) => row.variety_id === record.id || lineUses(row.sub_blocks, 'variety_id', record.id),
    },
  ],
  Season: [{ entity: 'FarmBlock', key: 'usage.blocks', match: (row, record) => row.season_id === record.id }],
  Supplier: [
    { entity: 'InputInvoice', key: 'usage.invoices', match: (row, record) => row.supplier_id === record.id },
    {
      entity: 'InputItem',
      key: 'usage.items',
      match: (row, record) => (row.supplier_ids || []).includes(record.id),
    },
  ],
  Task: [{ entity: 'DailyReport', key: 'usage.reports', match: (row, record) => row.task_id === record.id }],
  InputCategory: [{ entity: 'InputItem', key: 'usage.items', match: (row, record) => (row.category || '').trim() === record.name }],
  WorkerFunction: [{ entity: 'Worker', key: 'usage.workers', match: (row, record) => row.worker_function === record.name }],
  MachineType: [{ entity: 'Machine', key: 'usage.machines', match: (row, record) => row.type === record.name }],
  TaskNature: [{ entity: 'Task', key: 'usage.tasks', match: (row, record) => row.type === record.name }],
};

// Liste des données opérationnelles qui référencent cet élément de paramétrage.
export async function findParamUsage(kind, record) {
  const checks = CHECKS[kind];
  if (!record?.id || !checks) return [];
  const found = await Promise.all(
    checks.map(async (check) => {
      const rows = await fetchList(base44.entities[check.entity], {});
      const count = rows.filter((row) => check.match(row, record)).length;
      return count ? { key: check.key, count } : null;
    }),
  );
  return found.filter(Boolean);
}

export function usageLabel(usage, t) {
  return (usage || []).map((row) => `${t(row.key)} (${row.count})`).join(', ');
}

// Verrouille la modification et la suppression dès que l'élément est utilisé.
export function useParamLock(kind, record) {
  const [usage, setUsage] = useState([]);
  const id = record?.id || '';
  const name = record?.name || '';

  useEffect(() => {
    let active = true;
    if (!id) {
      setUsage([]);
      return undefined;
    }
    findParamUsage(kind, record).then((rows) => {
      if (active) setUsage(rows);
    });
    return () => {
      active = false;
    };
  }, [kind, id, name]);

  return { usage, locked: usage.length > 0 };
}