import { buildRateIndex, rateFor } from '@/lib/wageRates';
import { clean, fold } from '@/lib/reportImport';

// Deux libellés se ressemblent quand, une fois pliés, ils sont égaux ou l'un contient
// l'autre : « MAIS » retrouve « MAIS 1 » si c'est le seul candidat.
const similar = (a, b) => {
  const left = fold(a);
  const right = fold(b);
  return !!left && !!right && (left === right || left.includes(right) || right.includes(left));
};

export function findByName(list = [], name, field = 'name') {
  const text = clean(name);
  if (!text) return null;
  const exact = list.find((row) => fold(row[field]) === fold(text));
  if (exact) return exact;
  const near = list.filter((row) => similar(row[field], text));
  return near.length === 1 ? near[0] : null;
}

// Nature de travail du classeur rapprochée d'un type d'opération de FarmFlow.
const NATURE_TYPES = [
  [/irrigation/, 'irrigation'],
  [/fertigation|fertilis|engrais|epandage|fumier|amendement/, 'fertilising'],
  [/desherb|traitement|pulveris|phytosanitaire|sulfat/, 'spraying'],
  [/plantation|semaille|semis|repiqu/, 'planting'],
  [/recolte|recolt|cueillette|taille|coupe/, 'harvest'],
  [/soudeur|soudure|reparation|maintenance|entretien|vidange|reglage/, 'maintenance'],
  [/transport/, 'transport'],
];

export function operationFor(nature) {
  const text = fold(nature);
  const found = NATURE_TYPES.find(([pattern]) => pattern.test(text));
  return found ? found[1] : 'other';
}

export function taskFor(tasks = [], nature) {
  const byName = findByName(tasks, nature, 'title');
  if (byName) return byName;
  const operation = operationFor(nature);
  const byType = tasks.filter((task) => task.type === operation);
  return byType.length === 1 ? byType[0] : null;
}

// Les salaires journaliers pratiqués dans le classeur, rapprochés des taux des ouvriers.
// Un ouvrier peut avoir changé de taux pendant la période : chacun de ses taux compte.
export function workersByRate({ workers = [], wageRates = [], dates = [] }) {
  const index = buildRateIndex(wageRates);
  const map = new Map();
  workers
    .filter((worker) => worker.active !== false)
    .forEach((worker) => {
      const rates = new Set((dates.length ? dates : ['']).map((date) => rateFor(worker, index, date)));
      rates.forEach((rate) => {
        const value = Math.round((Number(rate) || 0) * 100) / 100;
        if (!(value > 0)) return;
        if (!map.has(value)) map.set(value, []);
        const list = map.get(value);
        if (!list.some((row) => row.id === worker.id)) list.push(worker);
      });
    });
  return map;
}

// Choix proposés d'emblée : tout ce qui se rapproche sans ambiguïté est présélectionné.
export function buildDefaultChoices({ analysis, farms, blocks, tasks, machines, items, workers, wageRates }) {
  const farmChoices = {};
  analysis.farmNames.forEach((name) => {
    const farm = findByName(farms, name);
    if (farm) farmChoices[name] = farm.id;
  });

  const blockChoices = {};
  analysis.places.forEach((row) => {
    const farm = farms.find((entry) => entry.id === farmChoices[row.farmName]);
    if (!farm) return;
    const scoped = blocks.filter((block) => fold(block.farm) === fold(farm.name));
    const block = findByName(scoped, row.place);
    if (block) blockChoices[row.key] = block.id;
  });

  const taskChoices = {};
  analysis.natures.forEach((row) => {
    const task = taskFor(tasks, row.name);
    if (task) taskChoices[row.name] = task.id;
  });

  const machineChoices = {};
  analysis.machines.forEach((row) => {
    const machine = findByName(machines, row.name);
    if (machine) machineChoices[row.name] = machine.id;
  });

  const itemChoices = {};
  analysis.items.forEach((row) => {
    const item = findByName(items, row.name);
    if (item) itemChoices[row.name] = item.id;
  });

  const rateCandidates = workersByRate({ workers, wageRates, dates: analysis.dates });
  const wageChoices = {};
  analysis.wages.forEach((row) => {
    const candidates = rateCandidates.get(row.rate) || [];
    if (candidates.length === 1) wageChoices[row.rate] = candidates[0].id;
  });

  return { farmChoices, blockChoices, taskChoices, machineChoices, itemChoices, wageChoices, rateCandidates };
}

function noteFor(row, sheetName) {
  const parts = [];
  if (row.work !== null && row.work !== undefined) parts.push(String(row.work));
  if (row.machinery) {
    const start = row.machinery.counterStart;
    const end = row.machinery.counterEnd;
    const m3 = row.machinery.m3;
    if (start !== null || end !== null) parts.push(`${start ?? '—'} → ${end ?? '—'}`);
    if (m3) parts.push(`${m3} m3`);
  }
  if (row.delivery) parts.push(row.delivery);
  parts.push(`Excel ${sheetName} · ligne ${row.row}`);
  return parts.join(' · ');
}

// Lignes prêtes à écrire : une ligne du classeur devient un rapport journalier, une
// fois la parcelle, l'opération et la main-d'œuvre rapprochées.
export function buildImportLines({ analysis, choices, data }) {
  const existing = new Set(
    (data.reports || []).map((report) => `${report.date}|${report.block_id}|${report.task_id}`),
  );
  const lines = [];

  analysis.sheets.forEach((sheet) => {
    sheet.rows.forEach((row) => {
      const blockId = choices.blockChoices[`${sheet.farmName}|${row.place}`] || '';
      const taskId = choices.taskChoices[row.nature] || '';

      const labour = (row.labour || [])
        .filter((entry) => entry.days > 0)
        .map((entry) => ({
          worker_id: choices.wageChoices[entry.rate] || '',
          days: entry.days,
          daily_rate: entry.rate,
        }));

      const machinery = row.machinery
        ? [{ machine_id: choices.machineChoices[row.machinery.name] || '', hours: row.machinery.hours }]
        : [];
      const inputs = row.input
        ? [{ item_id: choices.itemChoices[row.input.name] || '', quantity: row.input.quantity }]
        : [];

      const base = {
        key: row.key,
        sheet: sheet.name,
        row: row.row,
        date: sheet.date,
        farmName: sheet.farmName,
        place: row.place,
        nature: row.nature,
        description: row.nature || row.place,
        notes: noteFor(row, sheet.name),
        block_id: blockId,
        task_id: taskId,
        labour: labour.filter((entry) => entry.worker_id),
        machinery: machinery.filter((entry) => entry.machine_id),
        inputs: inputs.filter((entry) => entry.item_id),
        unresolved: row.labour.length > 0 && labour.some((entry) => !entry.worker_id),
      };

      let status = 'ready';
      if (choices.ignored[row.key]) status = 'ignored';
      else if (!sheet.date) status = 'nodate';
      else if (!blockId) status = 'noblock';
      else if (!taskId) status = 'notask';
      else if (base.unresolved) status = 'nolabour';
      else if (!base.labour.length && !base.machinery.length && !base.inputs.length) status = 'empty';
      else if (existing.has(`${sheet.date}|${blockId}|${taskId}`)) status = 'duplicate';

      lines.push({ ...base, status });
    });
  });

  const count = (name) => lines.filter((line) => line.status === name).length;
  return {
    lines,
    summary: {
      ready: count('ready'),
      duplicate: count('duplicate'),
      ignored: count('ignored'),
      incomplete:
        count('nodate') + count('noblock') + count('notask') + count('nolabour') + count('empty'),
      total: lines.length,
    },
  };
}