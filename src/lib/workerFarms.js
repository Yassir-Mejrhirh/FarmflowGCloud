// Affectation d'un ouvrier : soit fixe dans une seule ferme (champ farm), soit mobile
// avec une ou plusieurs fermes possibles (champ farms). Une liste vide garde l'ouvrier
// mobile disponible sur toutes les fermes, comme les fiches créées avant ce champ.

const clean = (value) => String(value || '').trim();

export const isFixedWorker = (worker) => Boolean(clean(worker?.farm));

export const workerFarmNames = (worker) =>
  (Array.isArray(worker?.farms) ? worker.farms : []).map(clean).filter(Boolean);

const same = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase();

// L'ouvrier est rattaché à cette ferme : il y est fixé, ou mobile et il l'a cochée.
export function assignedToFarm(worker, farmName) {
  if (!worker) return false;
  if (isFixedWorker(worker)) return same(worker.farm, farmName);
  return workerFarmNames(worker).some((name) => same(name, farmName));
}

export function worksOnFarm(worker, farmName) {
  if (!worker) return false;
  if (isFixedWorker(worker)) return same(worker.farm, farmName);
  const list = workerFarmNames(worker);
  if (!list.length) return true;
  return Boolean(clean(farmName)) && list.some((name) => same(name, farmName));
}

// Toutes les fermes où l'ouvrier peut être proposé, pour les listes et les filtres.
export const availableFarmNames = (worker) =>
  isFixedWorker(worker) ? [clean(worker.farm)] : workerFarmNames(worker);