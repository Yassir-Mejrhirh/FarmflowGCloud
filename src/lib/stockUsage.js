import { base44 } from '@/api/base44Client';
import { fetchList } from '@/lib/data';

const itemIdsOfReport = (report) => [
  ...(report.inputs || []).map((row) => row.item_id),
  ...(report.machinery || []).map((row) => row.fuel_item_id),
];

const sortByDate = (rows) =>
  rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

// Interventions qui consomment déjà ces intrants : elles doivent être supprimées avant
// toute suppression ou modification du stock correspondant.
export async function findStockUsages(itemIds) {
  const ids = new Set((itemIds || []).filter(Boolean));
  if (!ids.size) return [];

  const [reports, logs, blocks, machines] = await Promise.all([
    fetchList(base44.entities.DailyReport, {}, { sort: '-date' }),
    fetchList(base44.entities.MaintenanceLog, {}, { sort: '-date' }),
    fetchList(base44.entities.FarmBlock, {}),
    fetchList(base44.entities.Machine, {}),
  ]);

  const blockName = (id) => blocks.find((row) => row.id === id)?.name || '';
  const machineName = (id) => machines.find((row) => row.id === id)?.name || '';

  const fromReports = reports
    .filter((report) => itemIdsOfReport(report).some((id) => id && ids.has(id)))
    .map((report) => ({
      id: report.id,
      kind: 'report',
      date: report.date,
      label: blockName(report.block_id),
    }));

  const fromLogs = logs
    .filter((log) => (log.parts || []).some((part) => part.item_id && ids.has(part.item_id)))
    .map((log) => ({
      id: log.id,
      kind: 'maintenance',
      date: log.date,
      label: machineName(log.machine_id),
    }));

  return sortByDate([...fromReports, ...fromLogs]);
}