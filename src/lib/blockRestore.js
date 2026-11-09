import { base44 } from '@/api/base44Client';
import { loadBlockUsage } from '@/lib/blockSplit';

const today = () => new Date().toISOString().slice(0, 10);

// Brings the parcel that was divided back: it is recreated from the division
// record, everything its parcels still carry is re-attached to it, then those
// parcels are removed.
export async function restoreMother(division) {
  const mother = division.mother || {};
  const restored = await base44.entities.FarmBlock.create({
    company_id: division.company_id || '',
    name: mother.name || division.mother_name || '',
    code: mother.code || division.mother_code || '',
    farm: mother.farm || '',
    crop_id: mother.crop_id || '',
    variety_id: mother.variety_id || '',
    season_id: mother.season_id || '',
    planting_date: mother.planting_date || '',
    crop_end_date: mother.crop_end_date || '',
    status: mother.status || 'active',
    soil_type: mother.soil_type || '',
    notes: mother.notes || '',
    boundary: mother.boundary || [],
    area_ha: Number(mother.area_ha) || Number(division.mother_area_ha) || 0,
    sub_blocks: mother.sub_blocks || [],
    irrigation_zones: mother.irrigation_zones || [],
    // The division stays readable from the parcel it brought back.
    division_id: division.id,
  });

  for (const child of division.children || []) {
    const existing = await base44.entities.FarmBlock.get(child.block_id).catch(() => null);
    if (!existing) continue;
    const usage = await loadBlockUsage(child.block_id);
    const moves = [
      ...usage.reports.map((row) => base44.entities.DailyReport.update(row.id, { block_id: restored.id })),
      ...usage.tasks.map((row) => base44.entities.Task.update(row.id, { block_id: restored.id })),
      ...usage.harvests.map((row) => base44.entities.Harvest.update(row.id, { block_id: restored.id })),
      ...usage.expenses.map((row) => base44.entities.Expense.update(row.id, { block_id: restored.id })),
      ...usage.movements.map((row) => base44.entities.StockMovement.update(row.id, { block_id: restored.id })),
    ];
    await Promise.all(moves);
    await base44.entities.FarmBlock.delete(child.block_id);
  }

  await base44.entities.BlockDivision.update(division.id, { restored_date: today() });
  return restored;
}