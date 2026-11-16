// Personnes restées hors de la liste MO après le rapprochement : leurs fiches
// d'ouvrier mobile sont créées depuis le classeur, avec le salaire qui y est écrit
// et le transport déjà paramétré pour leur équipe.

import { base44 } from '@/api/base44Client';
import { rememberGlobalOption } from '@/lib/globalOptions';
import { buildTransportIndex, transportFor } from '@/lib/transportRates';

export const teamKey = (value) => String(value || '').trim().toLowerCase();

// Salaire le plus fréquent d'une équipe : il complète une personne dont la ligne du
// classeur ne porte aucun montant.
const mostFrequent = (values = []) => {
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
};

// Équipes lues dans le classeur, avec le nombre de personnes et le salaire courant
// de chacune ; une équipe absente de la liste MO est signalée.
export function detectTeams(names = [], knownTeams = []) {
  const known = new Set((knownTeams || []).map(teamKey));
  const map = new Map();

  (names || []).forEach((entry) => {
    const key = teamKey(entry.team);
    if (!key) return;
    const found = map.get(key) || {
      name: String(entry.team).trim(),
      count: 0,
      salaries: [],
      known: known.has(key),
    };
    found.count += 1;
    const salary = Number(entry.salary) || 0;
    if (salary > 0) found.salaries.push(salary);
    map.set(key, found);
  });

  return [...map.values()].map((team) => ({ ...team, salary: mostFrequent(team.salaries) }));
}

// Transport en vigueur dans la liste MO pour chaque équipe, repris tel quel.
export function teamTransports(workers = [], rates = [], date) {
  const index = buildTransportIndex(rates);
  const map = new Map();

  (workers || []).forEach((worker) => {
    const key = teamKey(worker.team);
    if (!key || map.has(key)) return;
    const transport = transportFor(worker, index, date);
    if (transport.mode !== 'none' && transport.rate > 0) map.set(key, transport);
  });

  return map;
}

// Fiches créées : ouvrier mobile rattaché à son équipe, salaire lu dans le classeur
// et transport de l'équipe. Une équipe inconnue rejoint la liste des équipes.
export async function addReconcileWorkers({ selections = [], transports = new Map() }) {
  const payloads = (selections || [])
    .filter((selection) => String(selection.name || '').trim())
    .map((selection) => {
      const transport = transports.get(teamKey(selection.team)) || null;
      const rate = Number(transport?.rate) || 0;
      return {
        name: String(selection.name).trim(),
        priority: '1',
        team: String(selection.team || '').trim(),
        farm: '',
        farms: [],
        daily_rate: Number(selection.salary) || 0,
        active: true,
        transport_enabled: rate > 0,
        transporter_name: transport?.transporter || '',
        transport_rate_type: transport?.mode === 'per_person' ? 'per_person' : 'fixed',
        transport_rate: rate,
      };
    });

  if (!payloads.length) return [];

  const created = await base44.entities.Worker.bulkCreate(payloads);
  const teams = [...new Set(payloads.map((payload) => payload.team).filter(Boolean))];
  await Promise.all(teams.map((team) => rememberGlobalOption('team', team)));
  return Array.isArray(created) ? created : [];
}