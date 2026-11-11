import { buildMachineCosts, isFuelItem } from '@/lib/machineryCosts';
import { byId } from '@/lib/data';

const day = (value) => String(value || '').slice(0, 10);

// Hours run by each machine, as recorded in the daily reports.
export function machineHours(reports = []) {
  const map = new Map();
  reports.forEach((report) => {
    (report.machinery || []).forEach((line) => {
      const hours = Number(line.hours) || 0;
      if (!line.machine_id || !(hours > 0)) return;
      const list = map.get(line.machine_id) || [];
      list.push({ date: day(report.date), hours });
      map.set(line.machine_id, list);
    });
  });
  return map;
}

// Hours worked between two dates, both included.
export function sumHours(lines = [], from, to) {
  return lines.reduce((sum, line) => {
    if (from && line.date < from) return sum;
    if (to && line.date > to) return sum;
    return sum + line.hours;
  }, 0);
}

// Hours worked after one date and up to another, both bounds applied as given.
const hoursSince = (lines = [], after, until) =>
  lines.reduce((sum, line) => {
    if (after && !(line.date > after)) return sum;
    if (until && !(line.date <= until)) return sum;
    return sum + line.hours;
  }, 0);

// Earliest date the report has to read to count the hours run since the last
// oil change of every machine, which may sit before the chosen period.
export function trackingStart(from, logs = []) {
  const latest = new Map();
  logs.forEach((log) => {
    if (log.kind !== 'vidange' || !log.date) return;
    const value = day(log.date);
    if (from && !(value < from)) return;
    const known = latest.get(log.machine_id);
    if (!known || value > known) latest.set(log.machine_id, value);
  });
  const dates = [...latest.values()].sort();
  return dates[0] || from;
}

// Oil changes of one machine, oldest first: the first one starts from the
// machine counter, the next ones add up the hours run since the previous change.
export function vidangeHistory({ logs = [], machineId, hours = [] }) {
  const changes = logs
    .filter((log) => log.machine_id === machineId && log.kind === 'vidange')
    .sort((a, b) => day(a.date).localeCompare(day(b.date)));

  let previous = null;
  return changes.map((log) => {
    const date = day(log.date);
    const reading = Number(log.hours_reading) || 0;
    let since;
    if (previous) {
      const worked = hoursSince(hours, previous.date, date);
      const delta = reading > 0 && reading > previous.reading ? reading - previous.reading : 0;
      since = worked > 0 ? worked : delta;
    } else {
      since = reading || sumHours(hours, null, date);
    }
    const row = { id: log.id, date, reading, since, first: !previous };
    previous = { date, reading };
    return row;
  });
}

export function monthBounds(key) {
  const [year, month] = key.split('-').map(Number);
  const last = new Date(year, month, 0).getDate();
  return { start: `${key}-01`, end: `${key}-${String(last).padStart(2, '0')}` };
}

// Months covered by the period, the last twelve at most.
export function monthKeys(from, to) {
  if (!from || !to) return [];
  const keys = [];
  let cursor = new Date(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, 1);
  const end = new Date(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, 1);
  while (cursor <= end && keys.length < 60) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return keys.slice(-12);
}

// One line per machine: use, maintenance, oil changes, counter, gasoil and the
// change of the machine cost per hour, all kept free of any parcel detail.
export function buildMachineTracking({
  machines = [],
  logs = [],
  reports = [],
  movements = [],
  items = [],
  invoices = [],
  counts = [],
  tasks = [],
  from,
  to,
}) {
  const hoursMap = machineHours(reports);
  const itemMap = byId(items);
  const taskMap = byId(tasks);
  const fuelIds = new Set(items.filter(isFuelItem).map((item) => item.id));

  const inPeriod = (value) => {
    const current = day(value);
    if (!current) return false;
    if (from && current < from) return false;
    if (to && current > to) return false;
    return true;
  };

  const periodLogs = logs.filter((log) => inPeriod(log.date));
  const periodReports = reports.filter((report) => inPeriod(report.date));
  const periodMovements = movements.filter((movement) => inPeriod(movement.date));

  const costs = buildMachineCosts({
    machines,
    logs: periodLogs,
    reports: periodReports,
    items,
    invoices,
    counts,
    movements: periodMovements,
  });

  const months = monthKeys(from, to).map((key) => {
    const bounds = monthBounds(key);
    const within = (value) => {
      const current = day(value);
      return current >= bounds.start && current <= bounds.end;
    };
    return {
      key,
      rows: buildMachineCosts({
        machines,
        logs: logs.filter((log) => within(log.date)),
        reports: reports.filter((report) => within(report.date)),
        items,
        invoices,
        counts,
        movements: movements.filter((movement) => within(movement.date)),
      }),
    };
  });

  const rows = machines.map((machine) => {
    const hours = hoursMap.get(machine.id) || [];
    const cost = costs[machine.id] || { fuel: 0, maintenance: 0, total: 0, hourly: null };
    const periodHours = sumHours(hours, from, to);

    // Gasoil drawn from stock for this machine, maintenance withdrawals excluded.
    const fuelLines = periodMovements.filter(
      (movement) =>
        movement.machine_id === machine.id &&
        movement.kind === 'out' &&
        !movement.maintenance_id &&
        fuelIds.has(movement.item_id),
    );
    const fuelQuantity = fuelLines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
    const fuelUnit = itemMap[fuelLines[0]?.item_id]?.unit || '';

    // Work natures, counted in hours and interventions, never per parcel.
    const works = new Map();
    periodReports.forEach((report) => {
      (report.machinery || []).forEach((line) => {
        const lineHours = Number(line.hours) || 0;
        if (line.machine_id !== machine.id || !(lineHours > 0)) return;
        const task = taskMap[report.task_id];
        const key = task?.id || `op-${report.operation || 'other'}`;
        const entry = works.get(key) || {
          key,
          label: task?.title || '',
          type: task?.type || report.operation || 'other',
          hours: 0,
          reports: new Set(),
        };
        entry.hours += lineHours;
        entry.reports.add(report.id || `${report.date}|${key}`);
        works.set(key, entry);
      });
    });

    const vidanges = vidangeHistory({ logs, machineId: machine.id, hours })
      .filter((row) => !to || row.date <= to)
      .reverse();

    const maintenance = periodLogs
      .filter((log) => log.machine_id === machine.id && log.kind !== 'vidange')
      .sort((a, b) => day(b.date).localeCompare(day(a.date)));

    const monthRows = months.map((month) => {
      const values = month.rows[machine.id] || { hours: 0, total: 0, hourly: null };
      return { key: month.key, hours: values.hours, cost: values.total, chmp: values.hourly };
    });

    return {
      id: machine.id,
      name: machine.name,
      counter: Number(machine.hours) || 0,
      hours: periodHours,
      fuelQuantity,
      fuelUnit,
      fuelPerHour: periodHours > 0 ? fuelQuantity / periodHours : null,
      fuelCost: cost.fuel,
      maintenanceCost: cost.maintenance,
      totalCost: cost.total,
      chmp: cost.hourly,
      vidanges,
      maintenance,
      works: [...works.values()].map((entry) => ({
        key: entry.key,
        label: entry.label,
        type: entry.type,
        hours: entry.hours,
        count: entry.reports.size,
      })),
      months: monthRows,
      active: periodHours > 0 || fuelQuantity > 0 || cost.maintenance > 0,
    };
  });

  return rows.sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
}