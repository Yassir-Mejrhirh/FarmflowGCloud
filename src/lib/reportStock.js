import { pickStorageFor } from '@/lib/inventory';
import { storagesForFarm } from '@/lib/storageScope';

// Stock leaving the store for one report: consumed inputs plus the fuel and
// lubricant drawn for each machine. Quantities of the same input are merged, so a
// fuel item entered both as an input and as machine fuel leaves the store once.
export function buildReportOutflow(inputs = [], machinery = []) {
  const rows = new Map();

  const add = (itemId, quantity) => {
    if (!itemId || !(quantity > 0)) return null;
    const row = rows.get(itemId) || { item_id: itemId, quantity: 0, machine_id: '' };
    row.quantity += quantity;
    rows.set(itemId, row);
    return row;
  };

  inputs.forEach((line) => add(line.item_id, Number(line.quantity) || 0));

  machinery.forEach((line) => {
    const drawn = [
      add(line.fuel_item_id, Number(line.fuel_quantity) || 0),
      add(line.lubricant_item_id, Number(line.lubricant_quantity) || 0),
    ];
    drawn.forEach((row) => {
      if (row && line.machine_id && Number(line.hours) > 0) row.machine_id = line.machine_id;
    });
  });

  return [...rows.values()];
}

// Stock movements written for one entry: the other inputs leave the store for each
// parcel in proportion to its weight, while fuel and lubricant leave it once, in
// full, for the machine that drew them.
export function buildReportMovements({ rows, outflow, weights, farmOf, storages, invoices, date, notes }) {
  const round = (value) => Math.round(value * 1000) / 1000;
  const storagesOf = (blockId) => {
    const farm = farmOf(blockId);
    return farm ? storagesForFarm(storages, farm) : [];
  };

  const inputRows = rows.flatMap((report) => {
    const weight = weights.get(report.block_id) ?? 1 / rows.length;
    return outflow
      .filter((line) => !line.machine_id)
      .map((line) => ({
        item_id: line.item_id,
        kind: 'out',
        quantity: round(line.quantity * weight),
        date,
        storage_id: pickStorageFor(storagesOf(report.block_id), invoices, line.item_id),
        block_id: report.block_id,
        report_id: report.id,
        notes,
      }));
  });

  const fuelRows = outflow
    .filter((line) => line.machine_id)
    .map((line) => ({
      item_id: line.item_id,
      kind: 'out',
      quantity: round(line.quantity),
      date,
      storage_id: pickStorageFor(storagesOf(rows[0].block_id), invoices, line.item_id),
      machine_id: line.machine_id,
      report_id: rows[0].id,
      notes,
    }));

  return [...inputRows, ...fuelRows];
}