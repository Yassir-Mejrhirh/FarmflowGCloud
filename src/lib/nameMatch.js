// Rapprochement des noms du pointage avec la liste de main-d'œuvre.
// Trois passes : nom identique, mêmes mots dans un autre ordre, puis ressemblance
// lettre à lettre. Chaque proposition porte un score et un niveau ; rien n'est
// retenu sans confirmation, et les noms douteux restent à confirmer.

// Nom ramené à ses mots : accents retirés, minuscules, ponctuation remplacée.
export const cleanName = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ')
    .trim();

// Clé de comparaison : les mots collés, pour ignorer espaces et traits d'union.
export const nameKey = (value) => cleanName(value).replace(/ /g, '');

const words = (value) => cleanName(value).split(' ').filter(Boolean);

// Indice de Dice sur les paires de lettres : robuste aux lettres manquantes.
export function similarity(left, right) {
  const a = nameKey(left);
  const b = nameKey(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const pairs = new Map();
  for (let index = 0; index < a.length - 1; index += 1) {
    const pair = a.slice(index, index + 2);
    pairs.set(pair, (pairs.get(pair) || 0) + 1);
  }
  let hits = 0;
  for (let index = 0; index < b.length - 1; index += 1) {
    const pair = b.slice(index, index + 2);
    const count = pairs.get(pair) || 0;
    if (count > 0) {
      pairs.set(pair, count - 1);
      hits += 1;
    }
  }
  return (2 * hits) / (a.length - 1 + b.length - 1);
}

// « Ali Ben Salah » et « Salah Ben Ali » désignent la même personne.
function wordScore(source, target) {
  const a = words(source);
  const b = words(target);
  if (!a.length || !b.length) return 0;
  const small = a.length <= b.length ? a : b;
  const big = small === a ? b : a;
  const pool = [...big];

  let hits = 0;
  small.forEach((word) => {
    const at = pool.findIndex((item) => item === word);
    if (at >= 0) {
      hits += 1;
      pool.splice(at, 1);
      return;
    }
    if (word.length >= 4 && pool.some((item) => item.includes(word) || word.includes(item))) hits += 0.6;
  });

  // Un nom plus long que l'autre n'est rapproché qu'à moitié.
  return (hits / small.length) * (small.length / big.length >= 0.5 ? 1 : 0.85);
}

export const LEVELS = ['exact', 'likely', 'review', 'none'];

export function levelOf(score) {
  if (score >= 0.995) return 'exact';
  if (score >= 0.86) return 'likely';
  if (score >= 0.62) return 'review';
  return 'none';
}

// Meilleure proposition et alternatives pour chaque nom du classeur.
export function proposeMatches(names = [], workers = []) {
  const list = (workers || []).filter((worker) => worker?.name);
  const results = new Map();

  [...new Set(names)].forEach((name) => {
    const scored = list
      .map((worker) => {
        const exact = nameKey(name) === nameKey(worker.name);
        const score = exact
          ? 1
          : Math.max(similarity(name, worker.name) * 0.98, wordScore(name, worker.name) * 0.94);
        return { worker, score: Math.round(score * 100) / 100 };
      })
      .sort((a, b) => b.score - a.score || a.worker.name.localeCompare(b.worker.name));

    const best = scored[0] && scored[0].score >= 0.62 ? scored[0] : null;
    results.set(name, {
      best: best ? { worker_id: best.worker.id, worker_name: best.worker.name, score: best.score, level: levelOf(best.score) } : null,
      alternatives: scored.filter((item) => item.score >= 0.45).slice(0, 4),
    });
  });

  return results;
}

// Nombre de noms du classeur rattachés à chaque ouvrier : deux noms pour un même
// ouvrier signalent une écriture en double.
export function usageCount(resolution = {}) {
  const usage = new Map();
  Object.values(resolution).forEach((workerId) => {
    if (!workerId) return;
    usage.set(workerId, (usage.get(workerId) || 0) + 1);
  });
  return usage;
}