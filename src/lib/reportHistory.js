import { natureLabel } from '@/lib/taskNature';

// The history reads one entry per validated report: the parcel rows written in one
// go share a group id. Rows saved before groups existed stand alone.
export function groupReports(rows, blockMap, natures, t) {
  const groups = new Map();
  (rows || []).forEach((row) => {
    const key = row.group_id || row.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  return [...groups.entries()].map(([key, reports]) => summarize(key, reports, blockMap, natures, t));
}

function summarize(key, reports, blockMap, natures, t) {
  const first = reports[0] || {};
  const blocks = [...new Set(reports.map((row) => row.block_id).filter(Boolean))];
  const workerIds = new Set();
  const machineIds = new Set();
  const itemIds = new Set();
  const taskKeys = new Set();

  reports.forEach((row) => {
    (row.labour || []).forEach((line) => line.worker_id && workerIds.add(line.worker_id));
    (row.machinery || []).forEach((line) => line.machine_id && machineIds.add(line.machine_id));
    (row.inputs || []).forEach((line) => line.item_id && itemIds.add(line.item_id));
    taskKeys.add(row.task_id || row.operation || 'other');
  });

  const tasks = [...taskKeys].map((taskKey) => {
    const row = reports.find((entry) => (entry.task_id || entry.operation || 'other') === taskKey);
    return natureLabel(row?.operation || 'other', natures, t);
  });

  return {
    key,
    reports,
    date: first.date || '',
    farm: blockMap[blocks[0]]?.farm || '',
    tasks: [...new Set(tasks)],
    blockCount: blocks.length,
    area: blocks.reduce((sum, id) => sum + (Number(blockMap[id]?.area_ha) || 0), 0),
    labourCount: workerIds.size,
    machineryCount: machineIds.size,
    inputCount: itemIds.size,
  };
}