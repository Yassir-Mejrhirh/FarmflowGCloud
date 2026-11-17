import { commitLine } from '@/lib/reportCommit';
import { applyReportHours, reportHoursByMachine } from '@/lib/machineCounter';

// Écriture des lignes rapprochées : chaque ligne du classeur devient un rapport
// journalier par la même fonction que la saisie manuelle, pour que le stock, les taux
// et les compteurs d'heures suivent exactement les mêmes règles.
export async function commitImportLines({ lines = [], context }) {
  const written = [];
  const failed = [];

  for (const line of lines) {
    try {
      const rows = await commitLine({
        line: {
          task_id: line.task_id,
          block_ids: [line.block_id],
          description: line.description,
          notes: line.notes,
          pump_station_id: '',
          pump_hours: 0,
          water_m3: 0,
          labour: line.labour,
          machinery: line.machinery,
          inputs: line.inputs,
        },
        date: line.date,
        blockMap: context.blockMap,
        task: context.taskMap[line.task_id],
        workerMap: context.workerMap,
        rateIndex: context.rateIndex,
        transportIndex: context.transportIndex,
        storages: context.storages,
        invoices: context.invoices,
        onHand: context.onHand,
      });
      written.push(...rows);
    } catch (error) {
      failed.push(line);
    }
  }

  if (written.length) {
    await applyReportHours({
      machines: context.machines,
      added: reportHoursByMachine(written),
    });
  }

  return { written, failed };
}