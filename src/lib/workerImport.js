// Import d'une liste d'ouvriers : reconnaissance des colonnes du fichier, lecture
// des valeurs et fusion avec les valeurs communes choisies sur l'écran d'import.

export const IMPORT_FIELDS = [
  { key: 'name', labelKey: 'wimport.field.name', required: true, aliases: ['nom', 'nom complet', 'nom et prenom', 'name', 'الاسم'] },
  { key: 'definition', labelKey: 'wimport.field.definition', aliases: ['definition', 'type', 'التعريف'] },
  { key: 'priority', labelKey: 'wimport.field.priority', aliases: ['priorite', 'priority', 'الأولوية'] },
  { key: 'worker_function', labelKey: 'wimport.field.function', aliases: ['fonction', 'metier', 'poste', 'function', 'الوظيفة'] },
  { key: 'team', labelKey: 'wimport.field.team', aliases: ['equipe', 'team', 'groupe', 'الفريق'] },
  { key: 'farm', labelKey: 'wimport.field.farm', aliases: ['ferme', 'affectation', 'exploitation', 'farm', 'الضحية'] },
  { key: 'daily_rate', labelKey: 'wimport.field.rate', aliases: ['salaire', 'salaire journalier', 'tarif', 'wage', 'rate', 'الأجر'] },
  { key: 'transporter_name', labelKey: 'wimport.field.transporter', aliases: ['transport', 'transporteur', 'chauffeur', 'transporter', 'الناقل'] },
  { key: 'transport_rate_type', labelKey: 'wimport.field.mode', aliases: ['type de tarif', 'type tarif', 'mode transport', 'mode', 'نوع التسعيرة'] },
  { key: 'transport_rate', labelKey: 'wimport.field.transportAmount', aliases: ['montant transport', 'tarif transport', 'prix transport', 'montant', 'ثمن النقل'] },
  { key: 'phone', labelKey: 'wimport.field.phone', aliases: ['telephone', 'tel', 'phone', 'الهاتف'] },
  { key: 'registration_number', labelKey: 'wimport.field.registration', aliases: ['immatriculation', 'matricule', 'cnss', 'registration', 'رقم التسجيل'] },
  { key: 'start_date', labelKey: 'wimport.field.startDate', aliases: ['date embauche', 'date debut', 'embauche', 'تاريخ التوظيف'] },
  { key: 'declared', labelKey: 'wimport.field.declared', aliases: ['declare', 'declaration', 'declared', 'التصريح'] },
];

const norm = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '');

// Les titres du fichier retrouvent leur champ par leur nom, d'abord à l'identique,
// puis par ressemblance.
export function guessMapping(headers = []) {
  const mapping = {};
  headers.forEach((header, index) => {
    const text = norm(header);
    if (!text) return;
    const exact = IMPORT_FIELDS.find((field) => field.aliases.some((alias) => norm(alias) === text));
    if (exact) {
      if (mapping[exact.key] === undefined) mapping[exact.key] = index;
      return;
    }
    const loose = IMPORT_FIELDS.find(
      (field) => mapping[field.key] === undefined
        && field.aliases.some((alias) => norm(alias).length > 3 && text.includes(norm(alias))),
    );
    if (loose) mapping[loose.key] = index;
  });
  return mapping;
}

// Le montant peut arriver avec des espaces, une virgule décimale ou un symbole.
export function parseNumber(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.,-]/g, '');
  if (!cleaned) return 0;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalized = cleaned.replace(',', '.');
  }
  return Number(normalized) || 0;
}

export function parsePriority(value) {
  const text = String(value ?? '');
  const standalone = text.match(/\b[123]\b/);
  if (standalone) return standalone[0];
  const any = text.match(/[123]/);
  return any ? any[0] : '';
}

export function parseDefinition(value) {
  const text = norm(value);
  if (!text) return '';
  if (text.includes('nomin')) return 'nominative';
  if (text.includes('grille') || text.includes('band') || text.includes('salair')) return 'salary_band';
  return '';
}

export function parseMode(value) {
  const text = norm(value);
  if (!text) return '';
  if (text.includes('personne') || text.includes('person') || text.includes('tete') || text.includes('فرد')) return 'per_person';
  if (text.includes('fix') || text.includes('forfait') || text.includes('jour')) return 'fixed';
  return '';
}

export function parseDeclared(value) {
  const text = norm(value);
  return ['oui', 'yes', 'true', 'vrai', '1', 'declare', 'declared', 'نعم'].includes(text);
}

export function parseDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const serial = Number(raw);
  if (Number.isFinite(serial) && serial > 20000 && serial < 60000) {
    return new Date(Date.UTC(1899, 11, 30) + serial * 86400000).toISOString().slice(0, 10);
  }
  const match = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (match) {
    const [, day, month, year] = match;
    const full = year.length === 2 ? `20${year}` : year;
    return `${full}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return '';
}

export const EMPTY_COMMON = {
  definition: '',
  priority: '',
  worker_function: '',
  team: '',
  farm: '',
  transporter_name: '',
  transport_rate_type: '',
  transport_rate: '',
};

const isFilled = (value) => value !== undefined && value !== null && String(value).trim() !== '';

// Les valeurs du fichier l'emportent : une valeur commune ne comble qu'un champ vide.
export function mergeValues(values = {}, common = {}) {
  const merged = {};
  IMPORT_FIELDS.forEach(({ key }) => {
    merged[key] = isFilled(values[key]) ? values[key] : common[key] ?? '';
  });
  return merged;
}

export function rowProblems(values, common) {
  const merged = mergeValues(values, common);
  const problems = [];
  if (!String(merged.name || '').trim()) problems.push('wimport.error.name');
  const transporter = String(merged.transporter_name || '').trim();
  const rate = parseNumber(merged.transport_rate);
  if ((transporter || rate > 0) && !(transporter && rate > 0)) problems.push('wimport.error.transport');
  return problems;
}

// Chaque transporteur ne sert qu'une équipe : les lignes qui le contredisent sont signalées.
export function validateDrafts(drafts = [], common = {}) {
  const problems = new Map();
  const included = drafts.filter((draft) => draft.include);

  const teamsByTransporter = new Map();
  included.forEach((draft) => {
    const merged = mergeValues(draft.values, common);
    const transporter = norm(merged.transporter_name);
    if (!transporter) return;
    const teams = teamsByTransporter.get(transporter) || new Set();
    teams.add(String(merged.team || '').trim());
    teamsByTransporter.set(transporter, teams);
  });

  included.forEach((draft) => {
    const merged = mergeValues(draft.values, common);
    const found = rowProblems(draft.values, common);
    if ((teamsByTransporter.get(norm(merged.transporter_name))?.size || 0) > 1) {
      found.push('wimport.error.transporter');
    }
    if (found.length) problems.set(draft.id, [...new Set(found)]);
  });

  return problems;
}

// Fiche ouvrier envoyée à la création, dans la forme utilisée par la fiche manuelle.
export function buildPayload(values, common) {
  const merged = mergeValues(values, common);
  const transportRate = parseNumber(merged.transport_rate);
  const transporter = String(merged.transporter_name || '').trim();
  const startDate = parseDate(merged.start_date);
  const payload = {
    name: String(merged.name || '').trim(),
    priority: parsePriority(merged.priority) || '1',
    definition: parseDefinition(merged.definition),
    worker_function: String(merged.worker_function || '').trim(),
    team: String(merged.team || '').trim(),
    farm: String(merged.farm || '').trim(),
    registration_number: String(merged.registration_number || '').trim(),
    phone: String(merged.phone || '').trim(),
    declared: parseDeclared(merged.declared),
    transport_enabled: Boolean(transporter && transportRate > 0),
    transporter_name: transporter,
    transport_rate_type: parseMode(merged.transport_rate_type) || 'fixed',
    transport_rate: transportRate,
    daily_rate: parseNumber(merged.daily_rate),
    active: true,
  };
  if (startDate) payload.start_date = startDate;
  return payload;
}