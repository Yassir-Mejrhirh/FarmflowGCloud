import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/data';
import { polygonAreaHa } from '@/lib/geo';
import { cutToFlat, defaultCuts, splitByCuts } from '@/lib/cutLines';

const PRECISION = 3;

const round = (value, digits = PRECISION) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

// Share of each new parcel: surface based when the parcel is measured, equal
// shares otherwise. Operations keep their total, never their exact lines.
export const shareWeights = (parts = []) => {
  const areas = parts.map((part) => Number(part.area_ha) || 0);
  const total = areas.reduce((sum, area) => sum + area, 0);
  if (total > 0) return areas.map((area) => area / total);
  return parts.map(() => (parts.length ? 1 / parts.length : 0));
};

// Splits one quantity across the parcels; the last share absorbs the rounding so
// the total stays exactly what it was.
export function distribute(total, weights) {
  const value = Number(total) || 0;
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  if (!sum) return weights.map(() => 0);
  const shares = weights.map((weight) => round(value * (weight / sum)));
  const gap = round(value - shares.reduce((acc, share) => acc + share, 0));
  if (shares.length) shares[shares.length - 1] = round(shares[shares.length - 1] + gap);
  return shares;
}

const emptyUsage = { reports: [], tasks: [], harvests: [], expenses: [], movements: [] };

export async function loadBlockUsage(blockId) {
  if (!blockId) return emptyUsage;
  const [reports, tasks, harvests, expenses] = await Promise.all([
    fetchList(base44.entities.DailyReport, { block_id: blockId }),
    fetchList(base44.entities.Task, { block_id: blockId }),
    fetchList(base44.entities.Harvest, { block_id: blockId }),
    fetchList(base44.entities.Expense, { block_id: blockId }),
  ]);
  // Fuel and lubricant leave the store on the machine, not on the surface: their
  // movements carry no parcel and are found through the reports of the parcel.
  const reportIds = reports.map((report) => report.id);
  const movements = await fetchList(
    base44.entities.StockMovement,
    reportIds.length
      ? { $or: [{ block_id: blockId }, { report_id: { $in: reportIds } }] }
      : { block_id: blockId },
  );
  return { reports, tasks, harvests, expenses, movements };
}

const sumLines = (rows, key, field) =>
  rows.reduce(
    (total, row) => total + (row[key] || []).reduce((sum, line) => sum + (Number(line[field]) || 0), 0),
    0,
  );

export function summarizeUsage(usage = emptyUsage) {
  const reports = usage.reports || [];
  const harvests = usage.harvests || [];
  const expenses = usage.expenses || [];
  return {
    reports: reports.length,
    labourDays: sumLines(reports, 'labour', 'days'),
    machineHours: sumLines(reports, 'machinery', 'hours'),
    inputLines: reports.reduce((total, report) => total + (report.inputs || []).length, 0),
    tasks: (usage.tasks || []).length,
    harvests: harvests.length,
    harvestKg: harvests.reduce((total, harvest) => total + (Number(harvest.quantity_kg) || 0), 0),
    expenses: expenses.length,
    expenseAmount: expenses.reduce((total, expense) => total + (Number(expense.amount) || 0), 0),
    movements: (usage.movements || []).length,
  };
}

// Harvests and expenses can only be rewritten or removed by an admin (their access
// rules), so a parcel carrying them can only be divided by one.
export async function canSplit(usage = emptyUsage) {
  const guarded = (usage.harvests || []).length + (usage.expenses || []).length > 0;
  if (!guarded) return true;
  const me = await base44.auth.me().catch(() => null);
  return me?.role === 'admin';
}

// Replaces the parcel by its new parcels, then hands every record that pointed at
// it over to them in proportion to their surface. The original is deleted last,
// so a failure anywhere leaves it in place.
export async function splitBlock({ block, parts, usage = emptyUsage, cuts = null }) {
  const weights = shareWeights(parts);
  const mapped = (block.boundary || []).length >= 3;
  const lines = mapped ? (cuts && cuts.length ? cuts : defaultCuts(block.boundary, weights)) : [];
  const rings = mapped ? splitByCuts(block.boundary, lines) : parts.map(() => []);
  // The group keeps the cut lines, so the boundaries stay adjustable afterwards.
  const groupId = mapped ? `split-${block.id}-${Date.now()}` : '';
  const created = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    created.push(
      await base44.entities.FarmBlock.create({
        name: part.name.trim(),
        code: block.code ? `${block.code}${parts.length > 1 ? index + 1 : ''}` : '',
        farm: block.farm || '',
        crop_id: block.crop_id || '',
        variety_id: part.variety_id || block.variety_id || '',
        season_id: block.season_id || '',
        planting_date: block.planting_date || '',
        crop_end_date: block.crop_end_date || '',
        status: block.status || 'active',
        soil_type: block.soil_type || '',
        notes: block.notes || '',
        boundary: rings[index] || [],
        area_ha: round(polygonAreaHa(rings[index]) || part.area_ha, 2),
        sub_blocks: [],
        irrigation_zones: [],
        split_group_id: groupId,
        split_index: index,
        split_source: mapped ? block.boundary : [],
        split_cuts: mapped ? lines.map(cutToFlat) : [],
      }),
    );
  }

  // The division itself is kept: it holds the parcel as it was before, so the
  // original can be brought back later and the filiation stays readable.
  const motherArea = Number(block.area_ha) || round(polygonAreaHa(block.boundary), 2);
  const division = await base44.entities.BlockDivision.create({
    company_id: block.company_id || '',
    date: new Date().toISOString().slice(0, 10),
    group_id: groupId,
    mother_id: block.id,
    mother_name: block.name || '',
    mother_code: block.code || '',
    mother_area_ha: motherArea,
    mother: {
      name: block.name || '',
      code: block.code || '',
      farm: block.farm || '',
      crop_id: block.crop_id || '',
      variety_id: block.variety_id || '',
      season_id: block.season_id || '',
      planting_date: block.planting_date || '',
      crop_end_date: block.crop_end_date || '',
      status: block.status || 'active',
      soil_type: block.soil_type || '',
      notes: block.notes || '',
      area_ha: motherArea,
      boundary: block.boundary || [],
      sub_blocks: block.sub_blocks || [],
      irrigation_zones: block.irrigation_zones || [],
    },
    children: created.map((child) => ({
      block_id: child.id,
      name: child.name,
      code: child.code || '',
      area_ha: child.area_ha,
    })),
    child_ids: created.map((child) => child.id),
  });
  await base44.entities.FarmBlock.bulkUpdate(created.map((child) => ({ id: child.id, division_id: division.id })));

  const reportParts = new Map();
  for (const report of usage.reports || []) {
    const rows = [];
    for (let index = 0; index < parts.length; index += 1) {
      const kept = report.machinery || [];
      rows.push(
        await base44.entities.DailyReport.create({
          date: report.date,
          block_id: created[index].id,
          group_id: report.group_id || '',
          task_id: report.task_id || '',
          operation: report.operation || 'other',
          description: report.description || '',
          notes: report.notes || '',
          labour: (report.labour || []).map((line) => ({
            worker_id: line.worker_id,
            days: distribute(line.days, weights)[index],
          })),
          // Hours, fuel and lubricant all follow the surface, like labour and inputs.
          machinery: kept.map((line) => ({
            machine_id: line.machine_id,
            hours: distribute(line.hours, weights)[index],
            fuel_item_id: line.fuel_item_id || '',
            fuel_quantity: distribute(line.fuel_quantity, weights)[index],
            lubricant_item_id: line.lubricant_item_id || '',
            lubricant_quantity: distribute(line.lubricant_quantity, weights)[index],
          })),
          inputs: (report.inputs || []).map((line) => ({
            item_id: line.item_id,
            quantity: distribute(line.quantity, weights)[index],
          })),
        }),
      );
    }
    reportParts.set(report.id, rows);
  }

  for (const movement of usage.movements || []) {
    const reportRows = movement.report_id ? reportParts.get(movement.report_id) : null;
    // Machine fuel and lubricant follow the same surface shares as the report
    // lines they document, so consumption and its cost stay on the right parcel.
    if (reportRows && movement.machine_id) {
      const shares = distribute(movement.quantity, weights);
      const costs = distribute(movement.cost, weights);
      for (let index = 0; index < parts.length; index += 1) {
        await base44.entities.StockMovement.create({
          item_id: movement.item_id,
          kind: movement.kind || 'out',
          quantity: shares[index],
          cost: costs[index],
          date: movement.date,
          storage_id: movement.storage_id || '',
          block_id: created[index].id,
          machine_id: movement.machine_id,
          report_id: reportRows[index].id,
          notes: movement.notes || '',
        });
      }
      continue;
    }

    if (reportRows) {
      const shares = distribute(movement.quantity, weights);
      const costs = distribute(movement.cost, weights);
      for (let index = 0; index < parts.length; index += 1) {
        await base44.entities.StockMovement.create({
          item_id: movement.item_id,
          kind: movement.kind || 'out',
          quantity: shares[index],
          cost: costs[index],
          date: movement.date,
          storage_id: movement.storage_id || '',
          block_id: created[index].id,
          report_id: reportRows[index].id,
          notes: movement.notes || '',
        });
      }
      continue;
    }

    const shares = distribute(movement.quantity, weights);
    const costs = distribute(movement.cost, weights);
    for (let index = 0; index < parts.length; index += 1) {
      await base44.entities.StockMovement.create({
        item_id: movement.item_id,
        kind: movement.kind || 'out',
        quantity: shares[index],
        cost: costs[index],
        date: movement.date,
        storage_id: movement.storage_id || '',
        block_id: created[index].id,
        count_id: movement.count_id || '',
        maintenance_id: movement.maintenance_id || '',
        notes: movement.notes || '',
      });
    }
  }

  for (const task of usage.tasks || []) {
    const costs = distribute(task.estimated_cost, weights);
    const actuals = distribute(task.actual_cost, weights);
    for (let index = 0; index < parts.length; index += 1) {
      await base44.entities.Task.create({
        title: task.title,
        type: task.type || 'other',
        subtask: task.subtask || '',
        description: task.description || '',
        block_id: created[index].id,
        crop_id: task.crop_id || '',
        assignee_id: task.assignee_id || '',
        due_date: task.due_date || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        machine_required: !!task.machine_required,
        estimated_cost: costs[index],
        actual_cost: actuals[index],
        completed_date: task.completed_date || '',
        notes: task.notes || '',
      });
    }
  }

  for (const harvest of usage.harvests || []) {
    const shares = distribute(harvest.quantity_kg, weights);
    for (let index = 0; index < parts.length; index += 1) {
      await base44.entities.Harvest.create({
        block_id: created[index].id,
        date: harvest.date,
        quantity_kg: shares[index],
        notes: harvest.notes || '',
      });
    }
  }

  for (const expense of usage.expenses || []) {
    const shares = distribute(expense.amount, weights);
    for (let index = 0; index < parts.length; index += 1) {
      await base44.entities.Expense.create({
        date: expense.date,
        category: expense.category || 'other',
        amount: shares[index],
        description: expense.description || '',
        block_id: created[index].id,
        machine_id: expense.machine_id || '',
      });
    }
  }

  // Nothing is destroyed before every new record exists.
  const removals = [
    ...(usage.movements || []).map((movement) => base44.entities.StockMovement.delete(movement.id)),
    ...(usage.reports || []).map((report) => base44.entities.DailyReport.delete(report.id)),
    ...(usage.tasks || []).map((task) => base44.entities.Task.delete(task.id)),
    ...(usage.harvests || []).map((harvest) => base44.entities.Harvest.delete(harvest.id)),
    ...(usage.expenses || []).map((expense) => base44.entities.Expense.delete(expense.id)),
  ];
  await Promise.all(removals);
  await base44.entities.FarmBlock.delete(block.id);

  return created;
}