// Ouvriers rattachés à une équipe mais sans transport : le tarif déjà paramétré pour
// leur équipe leur est proposé pendant le rapprochement, puis enregistré sur la fiche
// et dans l'historique daté des taux.

import { base44 } from '@/api/base44Client';
import { rememberGlobalOptions } from '@/lib/globalOptions';
import { buildTransportIndex, transportFor } from '@/lib/transportRates';
import { teamKey, teamTransports } from '@/lib/reconcileWorkers';

// Un ouvrier du pointage dont l'équipe a un transport connu, mais qui n'en bénéficie
// pas encore : ni paramétré sur sa fiche, ni enregistré dans ses taux datés.
export function transportGaps({ workers = [], matchedIds, rates = [], date }) {
  const index = buildTransportIndex(rates);
  const teams = teamTransports(workers, rates, date);
  const matched = matchedIds instanceof Set ? matchedIds : new Set(matchedIds || []);

  return (workers || [])
    .filter((worker) => worker?.id && matched.has(worker.id))
    .map((worker) => {
      const key = teamKey(worker.team);
      if (!key) return null;
      const current = transportFor(worker, index, date);
      if (current.mode !== 'none' && current.rate > 0) return null;
      const proposed = teams.get(key);
      if (!proposed || proposed.mode === 'none' || Number(proposed.rate) <= 0) return null;
      return { worker, team: String(worker.team).trim(), proposed };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.team.localeCompare(b.team) || String(a.worker.name).localeCompare(String(b.worker.name)),
    );
}

// Équipes dont des ouvriers n'ont pas de transport : le transport déjà paramétré par
// l'équipe est proposé pour ces ouvriers, une équipe sans transport reste signalée.
export function teamTransportGaps({ workers = [], rates = [], date }) {
  const index = buildTransportIndex(rates);
  const teams = new Map();

  (workers || []).forEach((worker) => {
    const key = teamKey(worker.team);
    if (!key) return;
    const entry = teams.get(key) || { key, team: String(worker.team).trim(), members: [], missing: [] };
    entry.members.push(worker);
    const current = transportFor(worker, index, date);
    if (current.mode === 'none' || Number(current.rate) <= 0) entry.missing.push(worker);
    teams.set(key, entry);
  });

  const proposed = teamTransports(workers, rates, date);
  return [...teams.values()]
    .filter((entry) => entry.missing.length)
    .map((entry) => ({ ...entry, proposed: proposed.get(entry.key) || null }))
    .sort((a, b) => a.team.localeCompare(b.team));
}

// Affectation confirmée : le transport de l'équipe part sur la fiche de l'ouvrier et
// dans son historique à la date d'effet, sans toucher aux autres ouvriers.
export async function applyTransportAssignments({ assignments = [], effectiveDate }) {
  const rows = (assignments || []).filter((assignment) => assignment?.worker?.id);
  if (!rows.length) return { updates: [], rates: [] };
  const date = effectiveDate || new Date().toISOString().slice(0, 10);

  const updates = rows.map(({ worker, proposed }) => ({
    id: worker.id,
    transport_enabled: true,
    transporter_name: String(proposed?.transporter || '').trim(),
    transport_rate_type: proposed?.mode === 'per_person' ? 'per_person' : 'fixed',
    transport_rate: Number(proposed?.rate) || 0,
  }));
  await base44.entities.Worker.bulkUpdate(updates);

  const rateRows = rows.map(({ worker, team, proposed }) => ({
    worker_id: worker.id,
    effective_date: date,
    mode: proposed?.mode === 'per_person' ? 'per_person' : 'fixed',
    transporter_name: String(proposed?.transporter || '').trim(),
    team: team || worker.team || '',
    rate: Number(proposed?.rate) || 0,
  }));
  const created = await base44.entities.TransportRate.bulkCreate(rateRows);
  const rates = Array.isArray(created) ? created : Array.isArray(created?.items) ? created.items : [];

  const names = [...new Set(rateRows.map((row) => row.transporter_name).filter(Boolean))];
  if (names.length) await rememberGlobalOptions('transporter', names);

  return { updates, rates };
}