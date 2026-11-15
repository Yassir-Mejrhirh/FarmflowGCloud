import { labourRate } from '@/lib/wageRates';
import { transportFor } from '@/lib/transportRates';
import { assignedDays } from '@/lib/pointageBalance';

const num = (value) => Number(value) || 0;
const round = (value) => Math.round(value * 100) / 100;

const empty = () => ({ pointed: 0, given: 0, remaining: 0, wage: 0, transport: 0, total: 0 });

function add(target, source) {
  target.pointed = round(target.pointed + source.pointed);
  target.given = round(target.given + source.given);
  target.remaining = round(target.remaining + source.remaining);
  target.wage = round(target.wage + source.wage);
  target.transport = round(target.transport + source.transport);
  target.total = round(target.total + source.total);
  return target;
}

// Cost of the pointages that are not validated yet: for each pointed worker, the days
// written on the sheet, the days already carried into a daily report of the same day
// and farm, the days still to ventilate, and the wage and transport they cost at the
// rates in force on the day of the pointage.
export function buildPointageCosts({
  sheets = [],
  reports = [],
  workers = [],
  rateIndex,
  transportIndex,
  blockMap = {},
  unknownLabel = '',
} = {}) {
  const workerMap = new Map(workers.map((worker) => [worker.id, worker]));
  // A fixed transport is paid once for the transporter and the team of a given day,
  // whatever the number of pointages of that day.
  const paidFixed = new Set();

  const rows = sheets.map((sheet) => {
    const assigned = assignedDays(reports, {
      date: sheet.date,
      farmName: sheet.farm_name,
      blockMap,
    });

    const lines = (sheet.lines || [])
      .filter((line) => line.worker_id && num(line.days) > 0)
      .map((line) => {
        const worker = workerMap.get(line.worker_id);
        const pointed = round(num(line.days));
        const given = round(Math.min(pointed, num(assigned.get(line.worker_id))));
        const remaining = round(pointed - given);
        const rate = labourRate(line, worker, rateIndex, sheet.date);
        const transport = transportFor(worker, transportIndex, sheet.date);
        let transportCost = 0;
        if (transport.mode !== 'none' && transport.rate > 0) {
          if (transport.mode === 'fixed') {
            const scope = `${sheet.date}|${transport.transporter || line.worker_id}|${transport.team}`;
            if (!paidFixed.has(scope)) {
              paidFixed.add(scope);
              transportCost = transport.rate;
            }
          } else {
            transportCost = transport.rate * pointed;
          }
        }
        const wage = round(pointed * rate);
        return {
          id: line.worker_id,
          name: worker?.name || unknownLabel,
          team: worker?.team || '',
          job: worker?.worker_function || '',
          pointed,
          given,
          remaining,
          rate,
          wage,
          transport: round(transportCost),
          total: round(wage + transportCost),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const teams = new Map();
    const sheetTotal = empty();
    lines.forEach((line) => {
      add(sheetTotal, line);
      const key = line.team || '';
      if (!teams.has(key)) teams.set(key, { name: key, ...empty() });
      add(teams.get(key), line);
    });

    return {
      id: sheet.id,
      date: sheet.date,
      farm: sheet.farm_name || '',
      lines,
      teams: [...teams.values()].sort((a, b) => a.name.localeCompare(b.name)),
      ...sheetTotal,
    };
  });

  // Only the pointages with days still to ventilate, or with no day written at all.
  const pending = rows
    .filter((row) => !row.lines.length || row.remaining > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || a.farm.localeCompare(b.farm));

  const totals = pending.reduce(
    (acc, row) => {
      add(acc, row);
      acc.count += 1;
      return acc;
    },
    { count: 0, ...empty() },
  );

  return { rows: pending, totals };
}