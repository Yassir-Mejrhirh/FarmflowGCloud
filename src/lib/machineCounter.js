import { base44 } from '@/api/base44Client';

const round = (value) => Math.round(value * 100) / 100;

// Hours each machine ran in a set of daily reports, summed over their lines.
export function reportHoursByMachine(reports = []) {
  const totals = new Map();
  reports.forEach((report) => {
    (report.machinery || []).forEach((line) => {
      const hours = Number(line.hours) || 0;
      if (!line.machine_id || !hours) return;
      totals.set(line.machine_id, (totals.get(line.machine_id) || 0) + hours);
    });
  });
  return totals;
}

// The counter of a machine follows its daily reports: the hours of a new report are
// added to it, a revised report only moves it by the difference, and a deleted report
// takes its hours back. `added` and `removed` are maps of machine id to hours.
export async function applyReportHours({ machines = [], added, removed }) {
  const deltas = new Map();
  [...(added || [])].forEach(([id, hours]) => deltas.set(id, (deltas.get(id) || 0) + hours));
  [...(removed || [])].forEach(([id, hours]) => deltas.set(id, (deltas.get(id) || 0) - hours));

  const updates = [...deltas.entries()]
    .map(([id, delta]) => {
      const machine = machines.find((row) => row.id === id);
      if (!machine || !round(delta)) return null;
      return { id, hours: Math.max(0, round((Number(machine.hours) || 0) + delta)) };
    })
    .filter(Boolean);

  if (updates.length) await base44.entities.Machine.bulkUpdate(updates);
  return updates;
}