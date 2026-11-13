import { buildReportOutflow, demandByStorage } from '@/lib/reportStock';
import { isMachineConsumableItem } from '@/lib/machineryCosts';
import { requiresPumpStation } from '@/lib/irrigation';
import { fmtDate } from '@/lib/format';

// One task of the day, entered on a single line of the daily report.
export function newLine() {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    task_id: '',
    block_ids: [],
    description: '',
    notes: '',
    pump_station_id: '',
    pump_hours: '',
    water_m3: '',
    labour: [],
    machinery: [],
    inputs: [],
    validated: false,
  };
}

export function lineOutflow(line) {
  return buildReportOutflow(line?.inputs || [], line?.machinery || []);
}

// Inputs requested by one line that exceed the stock of the depots they leave. The stock
// of one depot never covers another one: a report being edited hands back its own
// quantities first, keyed by depot and input.
export function shortagesOf(demand, { onHand = {}, stockTotals = {}, replaced = null } = {}) {
  const shortages = [];
  demand.forEach((items, storageId) => {
    items.forEach((requested, itemId) => {
      // Without any depot serving the farm, the overall stock stays the reference.
      const base = storageId
        ? Number(onHand[storageId]?.[itemId]?.quantity) || 0
        : Number(stockTotals[itemId]?.quantity) || 0;
      const available = base + (replaced?.get?.(`${storageId}|${itemId}`) || 0);
      if (requested > available + 0.000001) {
        shortages.push({ item_id: itemId, storage_id: storageId, requested, available });
      }
    });
  });
  return shortages;
}

export function lineShortages({ line, blockMap = {}, storages = [], invoices = [], onHand = {}, stockTotals = {}, replaced = null }) {
  const demand = demandByStorage({
    outflow: lineOutflow(line),
    blockIds: line?.block_ids || [],
    blockMap,
    storages,
    invoices,
    onHand,
  });
  return shortagesOf(demand, { onHand, stockTotals, replaced });
}

export function pumpLineReady(line) {
  return !!line?.pump_station_id && Number(line?.pump_hours) > 0 && Number(line?.water_m3) > 0;
}

export function machineryLineReady(line, task) {
  const ran = (line?.machinery || []).some((row) => row.machine_id && Number(row.hours) > 0);
  return ran || (requiresPumpStation(task) && !!line?.pump_station_id);
}

// Everything that keeps a line from being pre-validated, in the order the user
// reads it.
export function lineIssues({ line, date, task, blockMap = {}, stockTotals = {}, storages = [], invoices = [], onHand = {}, replaced = null, itemMap = {}, t }) {
  const issues = [];
  if (!line?.block_ids?.length) issues.push(t('report.needBlockLine'));
  if (!line?.task_id) issues.push(t('report.needTaskLine'));

  (line?.block_ids || []).forEach((id) => {
    const block = blockMap[id];
    if (!block) return;
    if (block.planting_date && date < block.planting_date) {
      issues.push(t('report.outOfRangeBefore', { date: fmtDate(block.planting_date) }));
    }
    if (block.crop_end_date && date > block.crop_end_date) {
      issues.push(t('report.outOfRangeAfter', { date: fmtDate(block.crop_end_date) }));
    }
  });

  if (task?.machine_required && !machineryLineReady(line, task)) issues.push(t('report.machineRequired'));
  if (requiresPumpStation(task) && !pumpLineReady(line)) issues.push(t('report.pumpRequired'));

  const consumable = (line?.inputs || []).some(
    (row) => row.item_id && isMachineConsumableItem(itemMap[row.item_id]),
  );
  if (consumable) issues.push(t('report.machineOnlyFuel'));

  if (lineShortages({ line, blockMap, storages, invoices, onHand, stockTotals, replaced }).length) {
    issues.push(t('report.stockBlocked'));
  }
  return issues;
}