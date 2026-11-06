import { base44 } from '@/api/base44Client';

// One stock-out movement per lubricant or spare part withdrawn for a maintenance
// operation, so the store and the machine both know where the item went.
export function buildMaintenanceMovements(log, note = '') {
  return (log.parts || [])
    .filter((line) => line.item_id && (Number(line.quantity) || 0) > 0)
    .map((line) => ({
      item_id: line.item_id,
      kind: 'out',
      quantity: Number(line.quantity) || 0,
      cost: (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
      date: log.date,
      storage_id: log.storage_id || '',
      machine_id: log.machine_id,
      maintenance_id: log.id,
      notes: note,
    }));
}

// Save/delete/edit all rebuild the operation's own movements and leave the others alone.
export async function syncMaintenanceMovements(log, note = '') {
  await base44.entities.StockMovement.deleteMany({ maintenance_id: log.id });
  const movements = buildMaintenanceMovements(log, note);
  if (movements.length) await base44.entities.StockMovement.bulkCreate(movements);
}

export async function clearMaintenanceMovements(logId) {
  await base44.entities.StockMovement.deleteMany({ maintenance_id: logId });
}