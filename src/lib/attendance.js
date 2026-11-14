// Workers pointed on a day, as a map worker id → days worked.
export function sheetDays(sheet) {
  const map = new Map();
  (sheet?.lines || []).forEach((line) => {
    const days = Number(line.days) || 0;
    if (line.worker_id && days > 0) map.set(line.worker_id, days);
  });
  return map;
}

// The pointed workers come first in the pointage screen: the farm's own workers,
// then the mobile ones grouped by team.
export function attendanceGroups(workers = [], farmName = '', t) {
  const fixed = farmName ? workers.filter((worker) => worker.farm === farmName) : [];
  const rest = workers.filter((worker) => !fixed.includes(worker));
  const groups = [];
  if (fixed.length) {
    groups.push({ key: 'farm', label: t('att.farmGroup', { farm: farmName }), workers: fixed });
  }
  const byTeam = new Map();
  rest.forEach((worker) => {
    const key = String(worker.team || '').trim() || 'none';
    if (!byTeam.has(key)) byTeam.set(key, []);
    byTeam.get(key).push(worker);
  });
  [...byTeam.keys()]
    .sort((a, b) => (a === 'none' ? 1 : b === 'none' ? -1 : a.localeCompare(b)))
    .forEach((key) => {
      groups.push({
        key: `team:${key}`,
        label: key === 'none' ? t('att.noTeam') : t('att.teamGroup', { name: key }),
        workers: byTeam.get(key),
      });
    });
  return groups;
}