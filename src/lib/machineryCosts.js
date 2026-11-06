import { avgCostOf, buildCountTotals, buildInputTotals, mergeTotals } from '@/lib/inventory';

const FUEL_WORDS = [
  'fuel',
  'carburant',
  'gasoil',
  'gazole',
  'diesel',
  'mazout',
  'essence',
  'وقود',
  'غازوال',
  'مازوت',
  'ديزل',
];

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const LUBRICANT_WORDS = [
  'lubrifiant',
  'lubricant',
  'huile',
  'oil',
  'graisse',
  'grease',
  'زيت',
  'شحم',
  'شحوم',
];

const matches = (item, words) => {
  const haystack = `${normalize(item?.category)} ${normalize(item?.name)}`;
  return words.some((word) => haystack.includes(word));
};

// Fuel is recognised from the input category or its name (free-text catalogue).
export function isFuelItem(item) {
  return matches(item, FUEL_WORDS);
}

export function isLubricantItem(item) {
  return matches(item, LUBRICANT_WORDS);
}

// Fuels and lubricants are charged to the machine that consumed them, and reach the
// parcel through its hours × hourly cost, never as a direct parcel input.
export function isMachineConsumableItem(item) {
  return isFuelItem(item) || isLubricantItem(item);
}

// Value of the lubricants and spare parts withdrawn from stock for an operation.
export function partsCostOf(log) {
  return (log?.parts || []).reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
    0,
  );
}

// What the operation really cost: its other costs plus the stock it consumed.
export function logTotalCost(log) {
  return (Number(log?.cost) || 0) + partsCostOf(log);
}

// Weighted hourly cost per machine: maintenance/repair costs plus the fuel burnt
// during the machine's hours, divided by the hours logged in daily reports.
export function buildMachineCosts({
  machines = [],
  logs = [],
  reports = [],
  items = [],
  invoices = [],
  counts = [],
  movements = [],
}) {
  // Weighted average price, as shown in the stock status: purchases plus validated counts.
  const purchaseTotals = mergeTotals(buildInputTotals(invoices), buildCountTotals(counts));
  const consumableIds = new Set(items.filter(isMachineConsumableItem).map((item) => item.id));

  const rows = {};
  machines.forEach((machine) => {
    rows[machine.id] = { maintenance: 0, fuel: 0, hours: 0, total: 0, hourly: null };
  });

  logs.forEach((log) => {
    const row = rows[log.machine_id];
    if (row) row.maintenance += logTotalCost(log);
  });

  // Fuel and lubricants are withdrawn from stock once, in full, for the machine that
  // consumed them: they are charged to the machine, never split between parcels.
  // Inputs withdrawn for a maintenance operation are already part of that operation's cost.
  const machineDrawnIds = new Set();
  movements.forEach((movement) => {
    const row = rows[movement.machine_id];
    if (!row || movement.kind !== 'out' || movement.maintenance_id) return;
    if (!consumableIds.has(movement.item_id)) return;
    machineDrawnIds.add(movement.item_id);
    row.fuel += (Number(movement.quantity) || 0) * avgCostOf(purchaseTotals, movement.item_id);
  });

  // Only the working hours are shared between the parcels of a report, by area.
  reports.forEach((report) => {
    const used = (report.machinery || [])
      .filter((line) => rows[line.machine_id] && Number(line.hours) > 0)
      .map((line) => ({ machine_id: line.machine_id, hours: Number(line.hours) }));

    const reportHours = used.reduce((sum, line) => sum + line.hours, 0);
    // Consumables entered directly as inputs are spread over the machines by hours,
    // except those already drawn per machine through a stock movement.
    const sharedCost = (report.inputs || []).reduce((sum, line) => {
      if (!consumableIds.has(line.item_id) || machineDrawnIds.has(line.item_id)) return sum;
      return sum + (Number(line.quantity) || 0) * avgCostOf(purchaseTotals, line.item_id);
    }, 0);

    used.forEach((line) => {
      const row = rows[line.machine_id];
      row.hours += line.hours;
      if (sharedCost && reportHours) {
        row.fuel += sharedCost * (line.hours / reportHours);
      }
    });
  });

  Object.values(rows).forEach((row) => {
    row.total = row.maintenance + row.fuel;
    row.hourly = row.hours > 0 ? row.total / row.hours : null;
  });

  return rows;
}