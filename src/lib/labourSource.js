// Journées de main-d'œuvre d'une période : les rapports journaliers d'abord, puis les
// journées de pointage qui n'ont pas encore été reprises dans un rapport du même jour et
// de la même ferme — aucune journée n'est comptée deux fois.

import { labourRate } from '@/lib/wageRates';
import { assignedDays } from '@/lib/pointageBalance';

const num = (value) => Number(value) || 0;
const round = (value) => Math.round(value * 100) / 100;

export function buildLabourEntries({ reports = [], sheets = [], workers = [], rateIndex, blockMap = {} }) {
  const workerMap = new Map((workers || []).map((worker) => [worker.id, worker]));
  const found = new Map();
  const pointage = [];

  const add = ({ workerId, date, days, cost, farm, block }) => {
    const value = round(days);
    if (!workerId || !date || value <= 0) return;
    const key = `${workerId}|${date}`;
    const current = found.get(key) || {
      worker_id: workerId,
      date,
      days: 0,
      cost: 0,
      farm: '',
      block: '',
    };
    current.days = round(current.days + value);
    current.cost = round(current.cost + cost);
    if (!current.farm && farm) current.farm = farm;
    if (!current.block && block) current.block = block;
    found.set(key, current);
  };

  reports.forEach((report) => {
    const block = blockMap[report.block_id];
    (report.labour || []).forEach((line) => {
      const days = num(line.days);
      if (!line.worker_id || days <= 0) return;
      const worker = workerMap.get(line.worker_id);
      add({
        workerId: line.worker_id,
        date: report.date,
        days,
        cost: days * labourRate(line, worker, rateIndex, report.date),
        farm: block?.farm || '',
        block: block?.name || '',
      });
    });
  });

  // Les journées déjà données à un rapport du même jour et de la même ferme restent
  // portées par ce rapport : seul le reste du pointage est ajouté.
  sheets.forEach((sheet) => {
    const assigned = assignedDays(reports, {
      date: sheet.date,
      farmName: sheet.farm_name,
      blockMap,
    });
    (sheet.lines || []).forEach((line) => {
      const pointed = num(line.days);
      if (!line.worker_id || pointed <= 0) return;
      const given = Math.min(pointed, num(assigned.get(line.worker_id)));
      const left = round(pointed - given);
      if (left <= 0) return;
      const worker = workerMap.get(line.worker_id);
      pointage.push({ workerId: line.worker_id, date: sheet.date, days: left });
      add({
        workerId: line.worker_id,
        date: sheet.date,
        days: left,
        cost: left * labourRate(line, worker, rateIndex, sheet.date),
        farm: sheet.farm_name || '',
        block: '',
      });
    });
  });

  return {
    entries: [...found.values()].sort(
      (a, b) => a.date.localeCompare(b.date) || a.worker_id.localeCompare(b.worker_id),
    ),
    pointage,
  };
}