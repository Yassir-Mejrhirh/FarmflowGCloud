import { periodDays } from '@/lib/labourGrid';

// Preview range: the simulated reports cover 1–7 November 2026.
export const SAMPLE_RANGE = { from: '2026-11-01', to: '2026-11-07' };

// One worked example is always shown with fixed values, so the arithmetic on screen can be
// checked at a glance: 4 days at 110 DH a day, 440 DH in total.
const REFERENCE_DAYS = 4;
const REFERENCE_RATE = 110;

function findReferenceWorker(workers = []) {
  const named = workers.find(
    (worker) => /nezha/i.test(worker?.name || '') && /amine/i.test(worker?.name || ''),
  );
  return named || workers[0] || null;
}

// Fake daily reports built on the workers and blocks already in the app. Nothing is saved:
// these objects only feed the labour status preview, and disappear when the preview is off.
export function buildSampleReports({ workers = [], blocks = [], from = SAMPLE_RANGE.from, to = SAMPLE_RANGE.to } = {}) {
  const dates = periodDays(from, to);
  const usableBlocks = (blocks || []).filter((block) => block?.id);
  if (!dates.length || !usableBlocks.length) return [];

  // The reference worker only ever appears in the worked example below.
  const reference = findReferenceWorker((workers || []).filter((worker) => worker?.id));

  const fixedByFarm = new Map();
  const teams = new Map();
  const loose = [];
  (workers || []).forEach((worker) => {
    if (!worker?.id || worker.id === reference?.id) return;
    if (worker.farm) {
      const list = fixedByFarm.get(worker.farm) || [];
      list.push(worker);
      fixedByFarm.set(worker.farm, list);
    } else if (worker.team) {
      const list = teams.get(worker.team) || [];
      list.push(worker);
      teams.set(worker.team, list);
    } else {
      loose.push(worker);
    }
  });

  const reports = [];
  let sequence = 0;

  dates.forEach((date, dayIndex) => {
    // Mobile teams: one report per working team, on a rotating block.
    [...teams.entries()].forEach(([, members], teamIndex) => {
      if ((dayIndex + teamIndex) % 3 === 0) return;
      const present = members.filter((member, memberIndex) => (dayIndex + memberIndex * 2 + teamIndex) % 5 !== 0);
      if (!present.length) return;
      const block = usableBlocks[(dayIndex + teamIndex) % usableBlocks.length];
      reports.push({
        id: `sample-${++sequence}`,
        date,
        block_id: block.id,
        labour: present.map((member, memberIndex) => ({
          worker_id: member.id,
          days: (dayIndex + memberIndex) % 11 === 0 ? 0.5 : 1,
        })),
      });
    });

    // Workers fixed to a farm: one report per farm on one of its own blocks.
    [...fixedByFarm.entries()].forEach(([farm, members], farmIndex) => {
      const block = usableBlocks.find((candidate) => candidate.farm === farm);
      if (!block) return;
      const present = members.filter((member, memberIndex) => (dayIndex + memberIndex + farmIndex) % 6 !== 0);
      if (!present.length) return;
      reports.push({
        id: `sample-${++sequence}`,
        date,
        block_id: block.id,
        labour: present.map((member) => ({ worker_id: member.id, days: 1 })),
      });
    });

    // Workers without farm nor team show up from time to time.
    if (dayIndex % 3 === 1 && loose.length) {
      const block = usableBlocks[(dayIndex + 1) % usableBlocks.length];
      reports.push({
        id: `sample-${++sequence}`,
        date,
        block_id: block.id,
        labour: loose.slice(0, 3).map((member) => ({ worker_id: member.id, days: 1 })),
      });
    }
  });

  // The worked example: the reference worker on the first four days, one day each.
  if (reference) {
    dates.slice(0, REFERENCE_DAYS).forEach((date, index) => {
      const block = usableBlocks[index % usableBlocks.length];
      reports.push({
        id: `sample-${++sequence}`,
        date,
        block_id: block.id,
        labour: [{ worker_id: reference.id, days: 1, daily_rate: REFERENCE_RATE }],
      });
    });
  }

  return reports;
}