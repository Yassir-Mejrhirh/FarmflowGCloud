import { buildRateIndex, rateFor } from '@/lib/wageRates';
import { todayISO } from '@/lib/format';
import { isFixedWorker, workerFarmNames } from '@/lib/workerFarms';

// Champs complémentaires proposés avant l'impression : le nom est toujours inclus.
export const WORKER_PRINT_FIELDS = [
  { id: 'salary', labelKey: 'wprint.salary', defaultOn: true },
  { id: 'mobility', labelKey: 'wprint.mobility', defaultOn: true },
  { id: 'role', labelKey: 'wprint.role', defaultOn: true },
  { id: 'team', labelKey: 'wprint.team', defaultOn: true },
  { id: 'priority', labelKey: 'wprint.priority', defaultOn: false },
  { id: 'declared', labelKey: 'wprint.declared', defaultOn: false },
  { id: 'phone', labelKey: 'wprint.phone', defaultOn: false },
];

export const DEFAULT_PRINT_FIELDS = WORKER_PRINT_FIELDS.filter((field) => field.defaultOn).map(
  (field) => field.id,
);

const columnOf = {
  name: (t) => ({ key: 'name', label: t('wprint.colName'), width: 30 }),
  salary: (t) => ({ key: 'salary', label: t('wprint.salary'), width: 15, align: 'end', money: true, digits: 2 }),
  mobility: (t) => ({ key: 'mobility', label: t('wprint.mobility'), width: 26 }),
  role: (t) => ({ key: 'role', label: t('wprint.role'), width: 18 }),
  team: (t) => ({ key: 'team', label: t('wprint.team'), width: 16 }),
  priority: (t) => ({ key: 'priority', label: t('wprint.priority'), width: 11, align: 'end' }),
  declared: (t) => ({ key: 'declared', label: t('wprint.declared'), width: 14 }),
  phone: (t) => ({ key: 'phone', label: t('wprint.phone'), width: 16 }),
};

// Ferme fixe, ou « Mobile » suivi des fermes possibles quand l'ouvrier se déplace.
const mobilityOf = (worker, mobileLabel) => {
  if (isFixedWorker(worker)) return String(worker.farm).trim();
  const names = workerFarmNames(worker);
  return names.length ? `${mobileLabel} · ${names.join(', ')}` : mobileLabel;
};

// Colonnes et lignes de la liste imprimée, dans l'ordre alphabétique des noms.
export function buildWorkerPrintData({ workers = [], rates = [], fields = [], t, date = todayISO() }) {
  const index = buildRateIndex(rates);
  const mobileLabel = t('wprint.mobileOnly');
  const selected = ['name', ...WORKER_PRINT_FIELDS.map((field) => field.id).filter((id) => fields.includes(id))];

  const columns = selected.map((id) => columnOf[id](t));
  const rows = [...workers]
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    .map((worker) => {
      const rate = rateFor(worker, index, date);
      return {
        name: worker.name || '',
        salary: rate > 0 ? rate : '',
        mobility: mobilityOf(worker, mobileLabel),
        role: worker.worker_function || '',
        team: worker.team || '',
        priority: worker.priority ? String(worker.priority) : '',
        declared: worker.declared ? t('common.yes') : t('common.no'),
        phone: worker.phone || '',
      };
    });

  return { columns, rows };
}

const localeOf = (lang) => (lang === 'ar' ? 'ar-MA' : 'fr-FR');

const cellText = (value, column, lang) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    const digits = column.digits ?? 0;
    const text = value.toLocaleString(localeOf(lang), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    return column.money ? `${text} MAD` : text;
  }
  return String(value);
};

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Fichier CSV lisible par Excel : séparateur point-virgule et BOM UTF-8.
export function buildWorkerCsv(columns, rows, lang) {
  const lines = [columns.map((column) => csvCell(column.label)).join(';')];
  rows.forEach((row) => {
    lines.push(columns.map((column) => csvCell(cellText(row[column.key], column, lang))).join(';'));
  });
  return `\uFEFF${lines.join('\r\n')}`;
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Ouvre une fenêtre prête à imprimer ; le navigateur propose aussi l'enregistrement en PDF.
export function printWorkerList({ title, subtitle, columns, rows, lang }) {
  const win = window.open('', '_blank', 'width=1120,height=820');
  if (!win) return false;

  const align = (column) => (column.align === 'end' ? 'right' : 'left');
  const head = columns
    .map(
      (column) =>
        `<th style="text-align:${align(column)}">${escapeHtml(column.label)}</th>`,
    )
    .join('');
  const body = rows
    .map((row, index) => {
      const cells = columns
        .map(
          (column) =>
            `<td style="text-align:${align(column)}"${
              column.align === 'end' ? ' class="num"' : ''
            }>${escapeHtml(cellText(row[column.key], column, lang))}</td>`,
        )
        .join('');
      return `<tr class="${index % 2 ? 'odd' : 'even'}">${cells}</tr>`;
    })
    .join('');

  win.document.write(`<!doctype html>
<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #1d2621; }
  header { display: flex; align-items: baseline; justify-content: space-between; gap: 24px;
    border-bottom: 2px solid #1d2621; padding-bottom: 8px; }
  h1 { margin: 0; font-size: 17px; letter-spacing: -0.01em; }
  .brand { font-size: 11px; color: #63746b; }
  .sub { margin-top: 6px; font-size: 10.5px; color: #63746b; }
  table { width: 100%; margin-top: 12px; border-collapse: collapse; }
  th { padding: 7px 9px; background: #f3f1e9; border-bottom: 1px solid #cfcbbd;
    font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #5c6a61; }
  td { padding: 6px 9px; border-bottom: 1px solid #eceae1; font-size: 11px; }
  tr.odd td { background: #fbfaf5; }
  td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
  footer { margin-top: 10px; font-size: 9.5px; color: #8a988f; }
  thead { display: table-header-group; }
</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <div class="brand">FarmFlow</div>
  </header>
  ${subtitle ? `<div class="sub">${escapeHtml(subtitle)}</div>` : ''}
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  <footer>${rows.length} ${lang === 'ar' ? 'سطر' : rows.length > 1 ? 'lignes' : 'ligne'}</footer>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}