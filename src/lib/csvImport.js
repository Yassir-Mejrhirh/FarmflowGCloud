const MAX_BYTES = 10 * 1024 * 1024;

export function isTooBig(file) {
  return (file?.size || 0) > MAX_BYTES;
}

function detectDelimiter(text) {
  const line = text.split(/\r?\n/)[0] || '';
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = 0;
  candidates.forEach((candidate) => {
    const count = line.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  });
  return best;
}

export function parseCsv(text) {
  const clean = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const delimiter = detectDelimiter(clean);
  const rows = [];
  let values = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (quoted) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          value += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      values.push(value);
      value = '';
    } else if (char === '\n') {
      values.push(value);
      rows.push(values);
      values = [];
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value);
  rows.push(values);

  const filled = rows.filter((row) => row.some((cell) => String(cell).trim() !== ''));
  if (!filled.length) return { headers: [], rows: [], delimiter };

  const headers = filled[0].map((cell) => String(cell).trim());
  const dataRows = filled.slice(1).map((row) => ({ values: row }));
  return { headers, rows: dataRows, delimiter };
}

export function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function autoMap(fields, headers) {
  const normalizedHeaders = headers.map(normalizeKey);
  const mapping = {};
  fields.forEach((field) => {
    const keys = [normalizeKey(field.name), normalizeKey(field.label)];
    const index = normalizedHeaders.findIndex((header) => keys.includes(header));
    mapping[field.name] = index >= 0 ? index : '';
  });
  return mapping;
}

export function normalizeDate(raw) {
  const value = String(raw).trim();
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const month = iso[2].padStart(2, '0');
    const day = iso[3].padStart(2, '0');
    if (Number(month) > 12 || Number(day) > 31) return null;
    return `${iso[1]}-${month}-${day}`;
  }
  const local = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (local) {
    const month = local[2].padStart(2, '0');
    const day = local[1].padStart(2, '0');
    if (Number(month) > 12 || Number(day) > 31) return null;
    return `${local[3]}-${month}-${day}`;
  }
  return null;
}

function coerce(field, value) {
  if (field.kind === 'number') {
    const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? { value: parsed } : { error: 'number' };
  }
  if (field.kind === 'boolean') {
    const lowered = value.toLowerCase();
    if (['true', '1', 'oui', 'yes', 'vrai', 'نعم'].includes(lowered)) return { value: true };
    if (['false', '0', 'non', 'no', 'faux', 'لا'].includes(lowered)) return { value: false };
    return { error: 'boolean' };
  }
  if (field.kind === 'date') {
    const parsed = normalizeDate(value);
    return parsed ? { value: parsed } : { error: 'date' };
  }
  if (field.kind === 'enum') {
    const match = (field.options || []).find((option) => option.toLowerCase() === value.toLowerCase());
    return match ? { value: match } : { error: 'option' };
  }
  return { value };
}

export function validateRows(rows, fields, mapping) {
  const records = [];
  const errors = [];

  rows.forEach((row, index) => {
    const record = {};
    let valid = true;

    fields.forEach((field) => {
      const column = mapping[field.name];
      const raw = column === '' || column === undefined ? '' : row.values[column] ?? '';
      const value = String(raw).trim();

      if (!value) {
        if (field.required) {
          errors.push({ row: index + 2, field: field.label, message: 'required' });
          valid = false;
        }
        return;
      }
      const result = coerce(field, value);
      if (result.error) {
        errors.push({ row: index + 2, field: field.label, message: result.error });
        valid = false;
        return;
      }
      record[field.name] = value;
    });

    if (valid) records.push(record);
  });

  return { records, errors };
}