import { labourRate } from '@/lib/wageRates';

const num = (value) => Number(value) || 0;
const CAPORAL = 'caporal';

// Every day of the period, as ISO dates, so the grid has one column per day.
export function periodDays(from, to) {
  if (!from || !to) return [];
  const days = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return [];
  while (cursor <= end) {
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    days.push(`${cursor.getFullYear()}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

const isCaporal = (worker) =>
  String(worker?.worker_function || '').trim().toLowerCase() === CAPORAL;

// A worker belongs to his farm when he is fixed there, to his team when he is mobile,
// and to the tail of the sheet when he is mobile without a team.
function groupOf(worker, options) {
  if (worker?.farm) {
    return { key: `farm:${worker.farm}`, rank: 0, order: worker.farm, label: worker.farm, kind: 'farm' };
  }
  if (worker?.team) {
    return {
      key: `team:${worker.team}`,
      rank: 1,
      order: worker.team,
      label: options.teamLabel(worker.team),
      kind: 'team',
    };
  }
  return { key: 'loose', rank: 2, order: '', label: options.noTeamLabel, kind: 'loose' };
}

// Row order inside a group: the transporter pays first, then the caporal, then the fixed
// workers, then the mobile workers, and the mobile workers without a team last.
function rowRank(worker) {
  if (isCaporal(worker)) return 0;
  if (worker?.farm) return 1;
  if (worker?.team) return 2;
  return 3;
}

export function buildLabourGroups({ reports = [], workers = [], rateIndex, transport, options = {} }) {
  const workerMap = new Map(workers.map((worker) => [worker.id, worker]));
  const groups = new Map();

  const ensureGroup = (worker) => {
    const info = groupOf(worker, options);
    if (!groups.has(info.key)) {
      groups.set(info.key, { ...info, rows: [], wages: 0, transport: 0 });
    }
    return groups.get(info.key);
  };

  const stats = new Map();
  reports.forEach((report) => {
    (report.labour || []).forEach((line) => {
      const worked = num(line.days);
      if (!line.worker_id || worked <= 0) return;
      const worker = workerMap.get(line.worker_id);
      const current = stats.get(line.worker_id) || { dates: new Map(), days: 0, cost: 0 };
      current.dates.set(report.date, num(current.dates.get(report.date)) + worked);
      current.days += worked;
      current.cost += worked * labourRate(line, worker, rateIndex, report.date);
      stats.set(line.worker_id, current);
    });
  });

  stats.forEach((entry, workerId) => {
    const worker = workerMap.get(workerId);
    const group = ensureGroup(worker);
    group.rows.push({
      key: workerId,
      rank: rowRank(worker),
      name: worker?.name || options.unknownLabel || '',
      job: worker?.worker_function || '',
      salary: entry.days ? entry.cost / entry.days : 0,
      dates: entry.dates,
      days: entry.days,
      total: entry.cost,
    });
    group.wages += entry.cost;
  });

  // Each transporter is paid for the group he drove, shown on the first line of that group.
  const transporters = new Map();
  (transport?.lines || []).forEach((line) => {
    if (!(line.cost > 0)) return;
    const group = groupOf(workerMap.get(line.workerId), options);
    const name = line.transporter || options.transportLabel || '';
    const key = `${group.key}|${name}`;
    const entry = transporters.get(key) || { groupKey: group.key, name, total: 0 };
    entry.total += line.cost;
    transporters.set(key, entry);
  });

  transporters.forEach((entry) => {
    const group = groups.get(entry.groupKey);
    if (!group) return;
    group.rows.push({
      key: `transport:${entry.groupKey}:${entry.name}`,
      rank: -1,
      transporter: true,
      name: entry.name,
      job: '',
      salary: 0,
      dates: new Map(),
      days: 0,
      total: entry.total,
    });
    group.transport += entry.total;
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      rows: [...group.rows].sort(
        (a, b) => a.rank - b.rank || String(a.name).localeCompare(String(b.name)),
      ),
      total: group.wages + group.transport,
    }))
    .sort((a, b) => a.rank - b.rank || String(a.order).localeCompare(String(b.order)));
}