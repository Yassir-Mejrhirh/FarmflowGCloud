import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/data';

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

const planarArea = (points = []) => {
  if (points.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    total += current.lng * next.lat - next.lng * current.lat;
  }
  return Math.abs(total / 2);
};

// Sutherland–Hodgman clip of a ring against an axis-aligned half plane.
const clipRing = (points, axis, bound, keepAbove) => {
  const inside = (point) => (keepAbove ? point[axis] >= bound : point[axis] <= bound);
  const clipped = [];
  points.forEach((current, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const currentIn = inside(current);
    const previousIn = inside(previous);
    if (currentIn !== previousIn) {
      const delta = current[axis] - previous[axis];
      const ratio = delta === 0 ? 0 : (bound - previous[axis]) / delta;
      clipped.push({
        lat: previous.lat + (current.lat - previous.lat) * ratio,
        lng: previous.lng + (current.lng - previous.lng) * ratio,
      });
    }
    if (currentIn) clipped.push({ lat: current.lat, lng: current.lng });
  });
  return clipped;
};

// Real boundaries for the new parcels: the original ring is cut into strips
// along its longer axis, each strip holding the surface share of its parcel.
export function splitBoundary(boundary = [], weights = []) {
  if (!boundary || boundary.length < 3 || !weights.length) {
    return weights.map(() => []);
  }

  const lats = boundary.map((point) => point.lat);
  const lngs = boundary.map((point) => point.lng);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lngSpan = (Math.max(...lngs) - Math.min(...lngs)) * Math.cos((midLat * Math.PI) / 180);
  const axis = lngSpan >= latSpan ? 'lng' : 'lat';
  const values = boundary.map((point) => point[axis]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const total = planarArea(boundary);
  if (!total) return weights.map(() => []);

  const cuts = [];
  let cumulative = 0;
  weights.slice(0, -1).forEach((weight) => {
    cumulative += weight;
    const target = total * cumulative;
    let low = min;
    let high = max;
    for (let i = 0; i < 46; i += 1) {
      const middle = (low + high) / 2;
      if (planarArea(clipRing(boundary, axis, middle, false)) < target) low = middle;
      else high = middle;
    }
    cuts.push((low + high) / 2);
  });

  const bounds = [min, ...cuts, max];
  return weights.map((_, index) => {
    const below = clipRing(boundary, axis, bounds[index + 1], false);
    return clipRing(below, axis, bounds[index], true);
  });
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
export async function splitBlock({ block, parts, usage = emptyUsage }) {
  const weights = shareWeights(parts);
  const rings = splitBoundary(block.boundary || [], weights);
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
        area_ha: round(part.area_ha, 2),
        sub_blocks: [],
        irrigation_zones: [],
      }),
    );
  }

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
          machinery: kept.map((line) => ({
            machine_id: line.machine_id,
            hours: distribute(line.hours, weights)[index],
            fuel_item_id: index === 0 ? line.fuel_item_id || '' : '',
            fuel_quantity: index === 0 ? Number(line.fuel_quantity) || 0 : 0,
            lubricant_item_id: index === 0 ? line.lubricant_item_id || '' : '',
            lubricant_quantity: index === 0 ? Number(line.lubricant_quantity) || 0 : 0,
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
    // Fuel and lubricant belong to the machine, not to the surface: they move as a
    // whole onto the first new parcel, never multiplied by the number of parcels.
    if (reportRows && movement.machine_id) {
      await base44.entities.StockMovement.create({
        item_id: movement.item_id,
        kind: movement.kind || 'out',
        quantity: Number(movement.quantity) || 0,
        date: movement.date,
        storage_id: movement.storage_id || '',
        machine_id: movement.machine_id,
        report_id: reportRows[0].id,
        notes: movement.notes || '',
      });
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