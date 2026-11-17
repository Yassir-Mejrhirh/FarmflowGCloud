// Doublons de la liste MO : les noms proches sont regroupés pour être vérifiés à
// l'écran, puis fusionnés seulement après confirmation. Les références de la fiche
// supprimée passent d'abord sur la fiche conservée, et la suppression n'a lieu
// qu'une fois tous les transferts terminés.

import { base44 } from '@/api/base44Client';
import { fetchAll } from '@/lib/data';
import { nameKey, similarity } from '@/lib/nameMatch';

const round = (value) => Math.round(value * 100) / 100;

// Deux noms sont proposés comme doublons au-delà de cette ressemblance.
const SIMILAR = 0.8;

// Champs repris de la fiche supprimée quand le profil conservé ne les porte pas.
const MERGE_FIELDS = [
  'priority', 'definition', 'worker_function', 'farm', 'farms', 'team', 'registration_number',
  'declared', 'transport_enabled', 'transporter_name', 'transport_rate_type', 'transport_rate',
  'phone', 'daily_rate', 'start_date', 'notes',
];

const isFilled = (value) =>
  Array.isArray(value) ? value.length > 0 : !(value === undefined || value === null || value === '' || value === 0 || value === false);

// Groupes de noms similaires, chacun avec ses fiches à comparer. Aucune fusion
// n'est décidée ici : le groupe est seulement présenté à l'écran.
export function findSimilarGroups(workers = []) {
  const list = (workers || []).filter((worker) => worker?.id && String(worker.name || '').trim());
  const parent = new Map(list.map((worker) => [worker.id, worker.id]));
  const root = (id) => {
    let current = id;
    while (parent.get(current) !== current) current = parent.get(current);
    return current;
  };
  const link = (left, right) => {
    const a = root(left);
    const b = root(right);
    if (a !== b) parent.set(b, a);
  };

  const keys = list.map((worker) => nameKey(worker.name));
  for (let index = 0; index < list.length; index += 1) {
    for (let next = index + 1; next < list.length; next += 1) {
      const same = keys[index] === keys[next];
      const close = keys[index].length >= 4 && similarity(list[index].name, list[next].name) >= SIMILAR;
      if (same || close) link(list[index].id, list[next].id);
    }
  }

  const groups = new Map();
  list.forEach((worker) => {
    const id = root(worker.id);
    groups.set(id, [...(groups.get(id) || []), worker]);
  });

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      key: root(group[0].id),
      workers: [...group].sort((a, b) => String(a.name).localeCompare(String(b.name))),
    }))
    .sort((a, b) => a.workers[0].name.localeCompare(b.workers[0].name));
}

// Fiche proposée par défaut : la plus renseignée, puis la plus ancienne.
export function suggestedKeeper(group = []) {
  return [...group].sort(
    (a, b) =>
      MERGE_FIELDS.filter((field) => isFilled(b[field])).length -
        MERGE_FIELDS.filter((field) => isFilled(a[field])).length ||
      String(a.created_date).localeCompare(String(b.created_date)),
  )[0]?.id || '';
}

// Ligne déjà présente pour la fiche conservée : les jours s'additionnent au lieu
// de laisser deux lignes pour la même personne.
function mergeDays(lines = [], dropIds, keepId) {
  const merged = new Map();
  lines.forEach((line) => {
    const workerId = dropIds.has(line.worker_id) ? keepId : line.worker_id;
    const found = merged.get(workerId) || { ...line, worker_id: workerId, days: 0 };
    found.days = round((Number(found.days) || 0) + (Number(line.days) || 0));
    merged.set(workerId, found);
  });
  return [...merged.values()];
}

const touches = (lines = [], dropIds) => lines.some((line) => dropIds.has(line?.worker_id));

// Fusion d'un groupe : informations complétées, références transférées, puis
// suppression des fiches en double. Une erreur de transfert remonte et empêche
// la suppression.
export async function mergeWorkerGroup({ keep, remove = [] }) {
  if (!keep?.id || !remove.length) return { merged: 0, deleted: 0 };
  const dropIds = new Set(remove.map((worker) => worker.id));

  // 1. Profil conservé : les champs vides reprennent ceux des fiches fusionnées.
  const patch = {};
  MERGE_FIELDS.forEach((field) => {
    if (isFilled(keep[field])) return;
    const source = remove.find((worker) => isFilled(worker[field]));
    if (source) patch[field] = source[field];
  });
  if (Object.keys(patch).length) await base44.entities.Worker.update(keep.id, patch);

  // 2. Pointages journaliers.
  const sheets = await fetchAll(base44.entities.AttendanceSheet, {});
  const sheetUpdates = sheets
    .filter((sheet) => touches(sheet.lines || [], dropIds))
    .map((sheet) => {
      const lines = mergeDays(sheet.lines || [], dropIds, keep.id);
      return {
        id: sheet.id,
        lines,
        total_days: round(lines.reduce((sum, line) => sum + (Number(line.days) || 0), 0)),
      };
    });
  if (sheetUpdates.length) await base44.entities.AttendanceSheet.bulkUpdate(sheetUpdates);

  // 3. Présences journalières.
  const attendances = (await fetchAll(base44.entities.Attendance, {})).filter((row) =>
    dropIds.has(row.worker_id),
  );
  if (attendances.length) {
    await base44.entities.Attendance.bulkUpdate(
      attendances.map((row) => ({ id: row.id, worker_id: keep.id })),
    );
  }

  // 4. Rapports quotidiens.
  const reports = await fetchAll(base44.entities.DailyReport, {});
  const reportUpdates = reports
    .filter((report) => touches(report.labour || [], dropIds))
    .map((report) => ({ id: report.id, labour: mergeDays(report.labour || [], dropIds, keep.id) }));
  if (reportUpdates.length) await base44.entities.DailyReport.bulkUpdate(reportUpdates);

  // 5. Brouillons de rapport.
  const drafts = await fetchAll(base44.entities.ReportDraft, {});
  const draftUpdates = drafts
    .filter((draft) => (draft.lines || []).some((line) => touches(line.labour || [], dropIds)))
    .map((draft) => ({
      id: draft.id,
      lines: (draft.lines || []).map((line) =>
        touches(line.labour || [], dropIds)
          ? { ...line, labour: mergeDays(line.labour || [], dropIds, keep.id) }
          : line,
      ),
    }));
  if (draftUpdates.length) await base44.entities.ReportDraft.bulkUpdate(draftUpdates);

  // 6. Historiques de taux : le taux déjà en place à la même date sur la fiche
  //    conservée reste, celui de la fiche fusionnée est retiré.
  const moveRates = async (entity) => {
    const rows = await fetchAll(entity, {});
    const moved = rows.filter((row) => dropIds.has(row.worker_id));
    if (!moved.length) return;
    await entity.bulkUpdate(moved.map((row) => ({ id: row.id, worker_id: keep.id })));
    const keptDates = new Set(rows.filter((row) => row.worker_id === keep.id).map((row) => row.effective_date));
    const stale = moved.filter((row) => keptDates.has(row.effective_date)).map((row) => row.id);
    if (stale.length) await entity.deleteMany({ id: { $in: stale } });
  };
  await moveRates(base44.entities.WageRate);
  await moveRates(base44.entities.TransportRate);

  // 7. Pointages en attente de rapprochement.
  const recons = await fetchAll(base44.entities.AttendanceReconciliation, {});
  const reconUpdates = recons
    .filter((item) => touches(item.lines || [], dropIds))
    .map((item) => ({
      id: item.id,
      lines: (item.lines || []).map((line) =>
        dropIds.has(line.worker_id) ? { ...line, worker_id: keep.id, worker_name: keep.name } : line,
      ),
    }));
  if (reconUpdates.length) await base44.entities.AttendanceReconciliation.bulkUpdate(reconUpdates);

  // 8. Suppression : les fiches en double ne partent qu'une fois tout transféré.
  const result = await base44.entities.Worker.deleteMany({ id: { $in: [...dropIds] } });

  return { merged: remove.length, deleted: Number(result?.deleted) || remove.length };
}