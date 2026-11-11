import { isFuelItem } from '@/lib/machineryCosts';
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
// oil change, which may sit before the chosen period.
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

// One line per day for a single machine: counter reading, hours worked, work
// types, oil changes, maintenance, gasoil drawn and consumption per hour, with
// no parcel detail at all.
export function buildMachineReport({
  machine,
  logs = [],
  reports = [],
  movements = [],
  items = [],
  tasks = [],
  from,
  to,
}) {
  const totals = { hours: 0, fuel: 0, fuelUnit: '', consumption: null, counter: 0, vidanges: 0 };
  if (!machine) return { rows: [], totals };

  const itemMap = byId(items);
  const taskMap = byId(tasks);
  const fuelIds = new Set(items.filter(isFuelItem).map((item) => item.id));
  const counterNow = Number(machine.hours) || 0;

  const days = new Map();
  const touch = (date) => {
    if (!date) return null;
    if (!days.has(date)) {
      days.set(date, { date, hours: 0, works: [], fuel: 0, fuelUnit: '', vidange: [], maintenance: [] });
    }
    return days.get(date);
  };

  // Hours worked and the work natures carried out that day.
  const hoursByDate = new Map();
  reports.forEach((report) => {
    (report.machinery || []).forEach((line) => {
      const hours = Number(line.hours) || 0;
      if (line.machine_id !== machine.id || !(hours > 0)) return;
      const date = day(report.date);
      hoursByDate.set(date, (hoursByDate.get(date) || 0) + hours);
      const row = touch(date);
      if (!row) return;
      row.hours += hours;
      const task = taskMap[report.task_id];
      const work = {
        key: task?.id || `op-${report.operation || 'other'}`,
        label: task?.title || '',
        type: task?.type || report.operation || 'other',
      };
      if (!row.works.some((entry) => entry.key === work.key)) row.works.push(work);
    });
  });

  // Gasoil drawn from stock for this machine, maintenance withdrawals excluded.
  movements.forEach((movement) => {
    if (movement.machine_id !== machine.id) return;
    if (movement.kind !== 'out' || movement.maintenance_id) return;
    if (!fuelIds.has(movement.item_id)) return;
    const row = touch(day(movement.date));
    if (!row) return;
    row.fuel += Number(movement.quantity) || 0;
    row.fuelUnit = itemMap[movement.item_id]?.unit || row.fuelUnit || '';
  });

  vidangeHistory({ logs, machineId: machine.id, hours: machineHours(reports).get(machine.id) || [] }).forEach(
    (entry) => {
      const row = touch(entry.date);
      if (row) row.vidange.push(entry);
    },
  );

  logs.forEach((log) => {
    if (log.machine_id !== machine.id || log.kind === 'vidange') return;
    const row = touch(day(log.date));
    if (!row) return;
    row.maintenance.push({ id: log.id, kind: log.kind || 'service', description: log.description || '' });
  });

  const inPeriod = (date) => (!from || date >= from) && (!to || date <= to);

  // The counter of a day is the current reading minus the hours run afterwards.
  const rows = [...days.values()]
    .filter((row) => inPeriod(row.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => {
      let after = 0;
      hoursByDate.forEach((hours, date) => {
        if (date > row.date) after += hours;
      });
      return {
        ...row,
        counter: counterNow - after,
        consumption: row.hours > 0 ? row.fuel / row.hours : null,
      };
    });

  const periodTotals = rows.reduce(
    (acc, row) => ({ hours: acc.hours + row.hours, fuel: acc.fuel + row.fuel }),
    { hours: 0, fuel: 0 },
  );

  return {
    rows,
    totals: {
      hours: periodTotals.hours,
      fuel: periodTotals.fuel,
      fuelUnit: rows.find((row) => row.fuelUnit)?.fuelUnit || '',
      consumption: periodTotals.hours > 0 ? periodTotals.fuel / periodTotals.hours : null,
      counter: counterNow,
      vidanges: rows.reduce((sum, row) => sum + row.vidange.length, 0),
    },
  };
}