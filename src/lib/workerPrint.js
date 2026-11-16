import { buildRateIndex, rateFor } from '@/lib/wageRates';
import { todayISO } from '@/lib/format';
import { isFixedWorker, workerFarmNames } from '@/lib/workerFarms';
import { buildWorkerSections } from '@/lib/workerSections';

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

// Colonnes, groupes et lignes de la liste imprimée. Les ouvriers sont lus dans le
// même ordre que le paramétrage MO : les fermes d'abord, puis les équipes, puis les
// ouvriers sans équipe, chaque groupe gardant son titre dans le document.
export function buildWorkerPrintData({ workers = [], rates = [], fields = [], t, date = todayISO() }) {
  const index = buildRateIndex(rates);
  const mobileLabel = t('wprint.mobileOnly');
  const selected = ['name', ...WORKER_PRINT_FIELDS.map((field) => field.id).filter((id) => fields.includes(id))];

  const columns = selected.map((id) => columnOf[id](t));

  const toRow = (worker) => {
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
  };

  const { farmBlocks, teams, rest } = buildWorkerSections(workers);
  const sections = [
    ...farmBlocks.map((block) => ({
      key: `farm-${block.farm || 'none'}`,
      label: block.farm || '—',
      rows: block.rows.map(toRow),
    })),
    ...teams.map((team) => ({
      key: `team-${team.key}`,
      label: team.farm ? `${team.key} · ${team.farm}` : team.key,
      rows: team.rows.map(toRow),
    })),
    ...(rest.length ? [{ key: 'rest', label: t('wprint.noTeam'), rows: rest.map(toRow) }] : []),
  ];

  const count = sections.reduce((total, section) => total + section.rows.length, 0);
  // Titre de groupe dans les fichiers Excel et CSV : le libellé seul sur la ligne.
  const rows = sections.flatMap((section) => [
    { __group: true, name: section.label },
    ...section.rows,
  ]);

  return { columns, sections, rows, count };
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
export function printWorkerList({ title, subtitle, columns, sections = [], count = 0, lang }) {
  const win = window.open('', '_blank', 'width=1120,height=820');
  if (!win) return false;

  const align = (column) => (column.align === 'end' ? 'right' : 'left');
  const head = columns
    .map(
      (column) =>
        `<th style="text-align:${align(column)}">${escapeHtml(column.label)}</th>`,
    )
    .join('');
  const body = sections
    .map((section) => {
      const groupTitle = `<tr class="group"><th colspan="${columns.length}" style="text-align:${
        lang === 'ar' ? 'right' : 'left'
      }">${escapeHtml(section.label)}</th></tr>`;
      const lines = section.rows
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
      return groupTitle + lines;
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
  tr.group th { padding: 6px 9px; background: #e9e5d8; border-bottom: 1px solid #d6d1c1;
    border-top: 1px solid #d6d1c1; font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: #3d4a42; }
  tr.group:first-child th { border-top: none; }
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
  <footer>${count} ${lang === 'ar' ? 'سطر' : count > 1 ? 'lignes' : 'ligne'}</footer>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}