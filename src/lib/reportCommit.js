import { base44 } from '@/api/base44Client';
import { buildReportMovements, buildReportOutflow } from '@/lib/reportStock';
import { labourRate } from '@/lib/wageRates';
import { transportFor } from '@/lib/transportRates';
import { requiresPumpStation } from '@/lib/irrigation';

const share = (value, weight) => Math.round((Number(value) || 0) * weight * 1000) / 1000;

// The parcels of one line share its resources in proportion to their area.
export function lineShares(blockIds = [], blockMap = {}) {
  const selected = blockIds.map((id) => blockMap[id]).filter(Boolean);
  const areas = selected.map((block) => Number(block.area_ha) || 0);
  const total = areas.reduce((sum, area) => sum + area, 0);
  return selected.map((block, index) => ({
    block,
    weight: total > 0 ? areas[index] / total : 1 / (selected.length || 1),
  }));
}

// Values written on every parcel of the line, scaled by the parcel's weight.
export function linePayload({ line, date, task, weight, workerMap, rateIndex, transportIndex }) {
  const irrigation = requiresPumpStation(task);
  return {
    date,
    task_id: line.task_id,
    operation: task?.type || 'other',
    description: (line.description || '').trim(),
    notes: line.notes || '',
    pump_station_id: irrigation ? line.pump_station_id || '' : '',
    pump_hours: irrigation ? share(line.pump_hours, weight) : 0,
    water_m3: irrigation ? share(line.water_m3, weight) : 0,
    labour: (line.labour || [])
      .filter((row) => row.worker_id && Number(row.days) > 0)
      .map((row) => {
        // The rate and the transport are frozen on the line: later revisions never
        // change the cost this report was written with.
        const worker = workerMap[row.worker_id];
        const transport = transportFor(worker, transportIndex, date);
        return {
          worker_id: row.worker_id,
          days: share(row.days, weight),
          daily_rate: labourRate(row, worker, rateIndex, date),
          transport_mode: transport.mode,
          transport_rate: transport.rate,
          transporter_name: transport.transporter,
          transport_team: transport.team || worker?.team || '',
        };
      }),
    machinery: (line.machinery || [])
      .filter((row) => row.machine_id && Number(row.hours) > 0)
      .map((row) => ({ machine_id: row.machine_id, hours: share(row.hours, weight) })),
    inputs: (line.inputs || [])
      .filter((row) => row.item_id && Number(row.quantity) > 0)
      .map((row) => ({ item_id: row.item_id, quantity: share(row.quantity, weight) })),
  };
}

// Writes one line of the report: the parcel rows, then the stock leaving the store.
// The hour counters are refreshed once for the whole report by the caller, so
// several lines never overwrite each other's counter.
export async function commitLine({
  line, date, blockMap, task, workerMap, rateIndex, transportIndex, storages, invoices, rows,
}) {
  const shares = lineShares(line.block_ids, blockMap);
  const weights = new Map(shares.map((row) => [row.block.id, row.weight]));
  const groupId = `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const written = rows?.length
    ? await Promise.all(
        rows.map((row) =>
          base44.entities.DailyReport.update(row.id, {
            ...linePayload({ line, date, task, weight: weights.get(row.block_id) ?? 1, workerMap, rateIndex, transportIndex }),
            block_id: row.block_id,
          }),
        ),
      )
    : await Promise.all(
        shares.map(({ block, weight }) =>
          base44.entities.DailyReport.create({
            ...linePayload({ line, date, task, weight, workerMap, rateIndex, transportIndex }),
            block_id: block.id,
            group_id: groupId,
          }),
        ),
      );

  // The movements of a reopened report are replaced, never added to.
  if (rows?.length) {
    await Promise.all(rows.map((row) => base44.entities.StockMovement.deleteMany({ report_id: row.id })));
  }

  const outflow = buildReportOutflow(line.inputs || [], line.machinery || []);
  if (outflow.length && written.length) {
    await base44.entities.StockMovement.bulkCreate(
      buildReportMovements({
        rows: written,
        outflow,
        weights,
        farmOf: (blockId) => blockMap[blockId]?.farm,
        storages,
        invoices,
        date,
        notes: (line.description || '').trim(),
      }),
    );
  }

  return written;
}