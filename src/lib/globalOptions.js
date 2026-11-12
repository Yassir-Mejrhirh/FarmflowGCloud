import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/data';

// Valeurs mémorisées au niveau global (unités d'intrants, équipes, transporteurs) :
// elles sont proposées dans les fiches suivantes, quelle que soit l'entreprise active.
export async function fetchGlobalOptions(kind) {
  const rows = await fetchList(base44.entities.GlobalOption, { kind }, { sort: 'name' });
  return rows.map((row) => row.name).filter(Boolean);
}

const isSame = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

export async function rememberGlobalOptions(kind, values) {
  const names = [...new Set((values || []).map((value) => (value || '').trim()).filter(Boolean))];
  if (!names.length) return;
  const existing = await fetchGlobalOptions(kind);
  const missing = names.filter((name) => !existing.some((value) => isSame(value, name)));
  if (missing.length) await base44.entities.GlobalOption.bulkCreate(missing.map((name) => ({ kind, name })));
}

export async function rememberGlobalOption(kind, value) {
  await rememberGlobalOptions(kind, [value]);
}

// Options de liste déroulante à partir de plusieurs sources, sans doublon.
export function mergeOptions(...lists) {
  const names = [];
  lists.flat().forEach((value) => {
    const name = (value || '').trim();
    if (name && !names.some((existing) => isSame(existing, name))) names.push(name);
  });
  return names.sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name }));
}