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

// Parts of one line between its parcels, in proportion to their area.
export function areaShares(blocks = []) {
  const areas = blocks.map((block) => Number(block.area_ha) || 0);
  const total = areas.reduce((sum, area) => sum + area, 0);
  return blocks.map((block, index) => ({
    block,
    weight: total > 0 ? areas[index] / total : 1 / (blocks.length || 1),
  }));
}

// What each depot must hold for one entry: the other inputs leave the store for each
// parcel in proportion to its weight, while fuel and lubricant leave it once, in full,
// from the depot of the first parcel. The depot chosen is the one the movements use.
export function demandByStorage({ outflow = [], blockIds = [], blockMap = {}, storages = [], invoices = [], onHand = null }) {
  const parcels = areaShares(blockIds.map((id) => blockMap[id]).filter(Boolean));
  const storagesOf = (block) => (block?.farm ? storagesForFarm(storages, block.farm) : []);
  const round = (value) => Math.round(value * 1000) / 1000;
  const demand = new Map();

  const add = (storageId, itemId, quantity) => {
    if (!itemId || !(quantity > 0)) return;
    if (!demand.has(storageId)) demand.set(storageId, new Map());
    const items = demand.get(storageId);
    items.set(itemId, (items.get(itemId) || 0) + quantity);
  };

  const inputs = outflow.filter((line) => !line.machine_id);
  const drawn = outflow.filter((line) => line.machine_id);
  const anchor = parcels[0]?.block;

  parcels.forEach(({ block, weight }) => {
    inputs.forEach((line) =>
      add(pickStorageFor(storagesOf(block), invoices, line.item_id, onHand), line.item_id, round(line.quantity * weight)),
    );
  });
  drawn.forEach((line) =>
    add(pickStorageFor(storagesOf(anchor), invoices, line.item_id, onHand), line.item_id, round(line.quantity)),
  );

  return demand;
}

export function mergeDemand(target, source) {
  source.forEach((items, storageId) => {
    if (!target.has(storageId)) target.set(storageId, new Map());
    const rows = target.get(storageId);
    items.forEach((quantity, itemId) => rows.set(itemId, (rows.get(itemId) || 0) + quantity));
  });
  return target;
}

// Stock the depot serving this input holds for a farm, shown beside the entry.
export function stockForFarm(storages = [], invoices = [], onHand = {}, farmName, itemId) {
  const storageId = pickStorageFor(storagesForFarm(storages, farmName), invoices, itemId, onHand);
  if (!storageId) return 0;
  return Number(onHand[storageId]?.[itemId]?.quantity) || 0;
}

// Stock movements written for one entry: the other inputs leave the store for each
// parcel in proportion to its weight, while fuel and lubricant leave it once, in
// full, for the machine that drew them.
export function buildReportMovements({ rows, outflow, weights, farmOf, storages, invoices, onHand = null, date, notes }) {
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
        storage_id: pickStorageFor(storagesOf(report.block_id), invoices, line.item_id, onHand),
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
      storage_id: pickStorageFor(storagesOf(rows[0].block_id), invoices, line.item_id, onHand),
      machine_id: line.machine_id,
      report_id: rows[0].id,
      notes,
    }));

  return [...inputRows, ...fuelRows];
}