// Balance between the days written on the pointage and the days assigned in the
// daily reports of one farm and one day: a pointed worker is settled when every
// day of the pointage has been given to a report.
const round = (value) => Math.round(value * 100) / 100;

export function addLabourDays(map, labour = []) {
  (labour || []).forEach((row) => {
    const days = Number(row.days) || 0;
    if (!row.worker_id || days <= 0) return;
    map.set(row.worker_id, round((map.get(row.worker_id) || 0) + days));
  });
  return map;
}

// Days already assigned by the reports of the same day and farm.
export function assignedDays(reports = [], { date, farmName, blockMap = {}, excludeIds } = {}) {
  const map = new Map();
  reports
    .filter((report) => report.date === date && !(excludeIds && excludeIds.has(report.id)))
    .filter((report) => !farmName || blockMap[report.block_id]?.farm === farmName)
    .forEach((report) => addLabourDays(map, report.labour));
  return map;
}

// Days each pointed worker still has to be given to a report.
export function remainingDays(pointageDays, assigned) {
  const map = new Map();
  (pointageDays || new Map()).forEach((pointed, workerId) => {
    map.set(workerId, Math.max(0, round(pointed - (assigned?.get(workerId) || 0))));
  });
  return map;
}

// Pointed workers whose days are not entirely assigned yet.
export function unsoldWorkers({ pointageDays, assigned, workerMap } = {}) {
  const rows = [];
  (pointageDays || new Map()).forEach((pointed, workerId) => {
    const given = round(assigned?.get(workerId) || 0);
    const left = round(pointed - given);
    if (left <= 0) return;
    rows.push({
      worker_id: workerId,
      name: workerMap?.[workerId]?.name || workerMap?.[workerId]?.team || '—',
      pointed: round(pointed),
      assigned: given,
      left,
    });
  });
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}