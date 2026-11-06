import { isFuelItem, isLubricantItem } from '@/lib/machineryCosts';

// Reports written in one entry share a group id, so the whole entry can be reopened
// together. Reports saved before groups existed stand alone.
export function entryReports(reports, report) {
  if (!report?.group_id) return [report];
  return reports.filter((row) => row.group_id === report.group_id);
}

// The shared form values behind one or more parcels: the resources were entered
// once, so the draft adds the shares back into the totals.
export function buildEditDraft(rows, movements, items) {
  const totals = (key, idKey, qtyKey) => {
    const map = new Map();
    rows.forEach((row) => {
      (row[key] || []).forEach((line) => {
        if (!line[idKey]) return;
        map.set(line[idKey], (map.get(line[idKey]) || 0) + (Number(line[qtyKey]) || 0));
      });
    });
    return map;
  };

  const labour = [...totals('labour', 'worker_id', 'days')].map(([worker_id, days]) => ({ worker_id, days }));
  const inputs = [...totals('inputs', 'item_id', 'quantity')].map(([item_id, quantity]) => ({ item_id, quantity }));
  const machinery = [...totals('machinery', 'machine_id', 'hours')].map(([machine_id, hours]) => ({
    machine_id,
    hours,
    fuel_item_id: '',
    fuel_quantity: '',
    lubricant_item_id: '',
    lubricant_quantity: '',
  }));

  // Fuel and lubricant are stored on the machine's own stock movement, so the draft
  // reads them back from the movements of the reports being reopened.
  const ids = new Set(rows.map((row) => row.id));
  movements
    .filter((movement) => ids.has(movement.report_id) && movement.machine_id && movement.kind !== 'in')
    .forEach((movement) => {
      const item = items.find((entry) => entry.id === movement.item_id);
      const line = machinery.find((row) => row.machine_id === movement.machine_id);
      if (!item || !line) return;
      const quantity = Number(movement.quantity) || 0;
      if (isFuelItem(item) && !line.fuel_item_id) {
        line.fuel_item_id = item.id;
        line.fuel_quantity = quantity;
      } else if (isLubricantItem(item) && !line.lubricant_item_id) {
        line.lubricant_item_id = item.id;
        line.lubricant_quantity = quantity;
      }
    });

  const first = rows[0] || {};
  return {
    date: first.date || '',
    task_id: first.task_id || '',
    description: first.description || '',
    notes: first.notes || '',
    labour,
    machinery,
    inputs,
  };
}