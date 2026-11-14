import { workerFarmNames } from '@/lib/workerFarms';

const farmOf = (worker) => worker.farm || workerFarmNames(worker)[0] || '';
const teamOf = (worker) => String(worker.team || '').trim();
const priorityOf = (worker) => String(worker.priority || '1');

const byName = (a, b) => (a.name || '').localeCompare(b.name || '');

// The default list is read in three blocks: the priority 1 workers without a team by
// farm, then the teams, then the workers of priority 2 and 3 who have no team either.
export function buildWorkerSections(rows = []) {
  const farmBlocks = [];
  const teams = new Map();
  const rest = [];

  rows.forEach((worker) => {
    const team = teamOf(worker);
    if (team) {
      const section = teams.get(team) || { key: team, farm: farmOf(worker), rows: [] };
      section.rows.push(worker);
      teams.set(team, section);
      return;
    }
    if (priorityOf(worker) !== '1') {
      rest.push(worker);
      return;
    }
    const farm = farmOf(worker);
    const last = farmBlocks[farmBlocks.length - 1];
    if (last && last.farm === farm) last.rows.push(worker);
    else farmBlocks.push({ farm, rows: [worker] });
  });

  const teamList = [...teams.values()]
    .map((section) => ({ ...section, rows: [...section.rows].sort(byName) }))
    .sort((a, b) => a.farm.localeCompare(b.farm) || a.key.localeCompare(b.key));

  return { farmBlocks, teams: teamList, rest };
}