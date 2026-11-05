import { avgCostOf, buildInputTotals } from '@/lib/inventory';

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

// Fuel is recognised from the input category or its name (free-text catalogue).
export function isFuelItem(item) {
  const haystack = `${normalize(item?.category)} ${normalize(item?.name)}`;
  return FUEL_WORDS.some((word) => haystack.includes(word));
}

// Weighted hourly cost per machine: maintenance/repair costs plus the fuel burnt
// during the machine's hours, divided by the hours logged in daily reports.
export function buildMachineCosts({ machines = [], logs = [], reports = [], items = [], invoices = [] }) {
  const purchaseTotals = buildInputTotals(invoices);
  const fuelItemIds = new Set(items.filter(isFuelItem).map((item) => item.id));

  const rows = {};
  machines.forEach((machine) => {
    rows[machine.id] = { maintenance: 0, fuel: 0, hours: 0, total: 0, hourly: null };
  });

  logs.forEach((log) => {
    const row = rows[log.machine_id];
    if (row) row.maintenance += Number(log.cost) || 0;
  });

  reports.forEach((report) => {
    const used = (report.machinery || [])
      .filter((line) => rows[line.machine_id] && Number(line.hours) > 0)
      .map((line) => ({ machine_id: line.machine_id, hours: Number(line.hours) }));

    const reportHours = used.reduce((sum, line) => sum + line.hours, 0);
    const fuelCost = (report.inputs || []).reduce(
      (sum, line) =>
        fuelItemIds.has(line.item_id) ? sum + (Number(line.quantity) || 0) * avgCostOf(purchaseTotals, line.item_id) : sum,
      0,
    );

    used.forEach((line) => {
      const row = rows[line.machine_id];
      row.hours += line.hours;
      if (fuelCost && reportHours) row.fuel += fuelCost * (line.hours / reportHours);
    });
  });

  Object.values(rows).forEach((row) => {
    row.total = row.maintenance + row.fuel;
    row.hourly = row.hours > 0 ? row.total / row.hours : null;
  });

  return rows;
}