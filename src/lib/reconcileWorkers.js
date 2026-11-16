// Personnes restées hors de la liste MO après le rapprochement : leurs fiches
// d'ouvrier mobile sont créées depuis le classeur, avec le salaire qui y est écrit
// et le transport déjà paramétré pour leur équipe.

import { base44 } from '@/api/base44Client';
import { rememberGlobalOptions } from '@/lib/globalOptions';
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

// Fiches créées : ouvrier mobile rattaché à son équipe, salaire lu dans le classeur,
// priorité, déclaration et fonction choisies. Le transport de l'équipe — repris de la
// liste MO ou saisi pour une nouvelle équipe — est enregistré sur la fiche et daté
// dans l'historique des taux.
export async function addReconcileWorkers({
  selections = [], transports = new Map(), teamSettings = {}, effectiveDate,
}) {
  const rows = (selections || [])
    .filter((selection) => String(selection.name || '').trim())
    .map((selection) => {
      const key = teamKey(selection.team);
      const transport = teamSettings[key] || transports.get(key) || null;
      const rate = Number(transport?.rate) || 0;
      return {
        transport,
        // Transport saisi pour une équipe nouvellement créée : il est daté en plus.
        newTeam: Boolean(teamSettings[key]),
        payload: {
          name: String(selection.name).trim(),
          priority: selection.priority || '3',
          team: String(selection.team || '').trim(),
          worker_function: String(selection.worker_function || '').trim() || 'Ouvrier',
          declared: Boolean(selection.declared),
          farm: '',
          farms: [],
          daily_rate: Number(selection.salary) || 0,
          active: true,
          transport_enabled: rate > 0,
          transporter_name: String(transport?.transporter || '').trim(),
          transport_rate_type: transport?.mode === 'per_person' ? 'per_person' : 'fixed',
          transport_rate: rate,
        },
      };
    });

  if (!rows.length) return [];

  const created = await base44.entities.Worker.bulkCreate(rows.map((row) => row.payload));
  // La réponse de création est reprise telle quelle : les noms ajoutés sont rapprochés
  // de ces fiches, sans dépendre d'une relecture de la liste complète.
  const workers = Array.isArray(created) ? created : Array.isArray(created?.items) ? created.items : [];
  const date = effectiveDate || new Date().toISOString().slice(0, 10);

  // Le transport de chaque fiche est daté à la période du pointage : les prochains
  // rapports reprennent ce paramétrage, y compris pour une équipe nouvellement créée.
  const rateRows = workers
    .map((worker, index) => {
      const row = rows[index];
      const rate = Number(row?.transport?.rate) || 0;
      if (!row?.newTeam || !worker?.id || rate <= 0) return null;
      return {
        worker_id: worker.id,
        effective_date: date,
        mode: row.transport.mode === 'per_person' ? 'per_person' : 'fixed',
        transporter_name: String(row.transport.transporter || '').trim(),
        team: row.payload.team,
        rate,
      };
    })
    .filter(Boolean);
  if (rateRows.length) await base44.entities.TransportRate.bulkCreate(rateRows);

  const teams = [...new Set(rows.map((row) => row.payload.team).filter(Boolean))];
  await rememberGlobalOptions('team', teams);
  const transporterNames = [...new Set(rateRows.map((row) => row.transporter_name).filter(Boolean))];
  if (transporterNames.length) await rememberGlobalOptions('transporter', transporterNames);

  return workers;
}