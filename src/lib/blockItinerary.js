import { avgCostOf, buildInputTotals } from '@/lib/inventory';

const num = (value) => Number(value) || 0;

// Technical and financial itinerary of each parcel, built from the daily reports:
// every operation with its labour, machinery (hours and fuel) and inputs, valued
// with the worker daily rate, the machine hourly rate and the weighted input cost.
export function buildBlockItinerary({
  reports = [],
  blocks = [],
  workers = [],
  machines = [],
  items = [],
  invoices = [],
}) {
  const purchaseTotals = buildInputTotals(invoices);
  const blockMap = new Map(blocks.map((block) => [block.id, block]));
  const workerMap = new Map(workers.map((worker) => [worker.id, worker]));
  const machineMap = new Map(machines.map((machine) => [machine.id, machine]));
  const itemMap = new Map(items.map((item) => [item.id, item]));

  const entries = new Map();

  reports.forEach((report) => {
    const block = blockMap.get(report.block_id);
    if (!block) return;

    const labour = (report.labour || [])
      .filter((line) => line.worker_id && num(line.days) > 0)
      .map((line) => {
        const worker = workerMap.get(line.worker_id);
        const days = num(line.days);
        const rate = num(worker?.daily_rate);
        return { key: line.worker_id, name: worker?.name || '', days, rate, cost: days * rate };
      });

    const machinery = (report.machinery || [])
      .filter((line) => line.machine_id && (num(line.hours) > 0 || num(line.fuel_quantity) > 0))
      .map((line, index) => {
        const machine = machineMap.get(line.machine_id);
        const fuelItem = itemMap.get(line.fuel_item_id);
        const hours = num(line.hours);
        const rate = num(machine?.hourly_rate);
        const quantity = num(line.fuel_quantity);
        const fuelCost = quantity * avgCostOf(purchaseTotals, line.fuel_item_id);
        return {
          key: `${line.machine_id}-${index}`,
          name: machine?.name || '',
          hours,
          rate,
          hoursCost: hours * rate,
          fuel:
            line.fuel_item_id && quantity > 0
              ? {
                  key: line.fuel_item_id,
                  name: fuelItem?.name || '',
                  unit: fuelItem?.unit || '',
                  quantity,
                  cost: fuelCost,
                }
              : null,
          cost: hours * rate + fuelCost,
        };
      });

    const inputs = (report.inputs || [])
      .filter((line) => line.item_id && num(line.quantity) > 0)
      .map((line) => {
        const item = itemMap.get(line.item_id);
        const quantity = num(line.quantity);
        const unitCost = avgCostOf(purchaseTotals, line.item_id);
        return {
          key: line.item_id,
          name: item?.name || '',
          unit: item?.unit || '',
          quantity,
          unitCost,
          cost: quantity * unitCost,
        };
      });

    const operation = {
      id: report.id,
      date: report.date,
      operation: report.operation,
      description: report.description || '',
      labour,
      machinery,
      inputs,
      totals: {
        labour: labour.reduce((sum, line) => sum + line.cost, 0),
        machinery: machinery.reduce((sum, line) => sum + line.cost, 0),
        inputs: inputs.reduce((sum, line) => sum + line.cost, 0),
        days: labour.reduce((sum, line) => sum + line.days, 0),
        hours: machinery.reduce((sum, line) => sum + line.hours, 0),
      },
    };
    operation.totals.cost = operation.totals.labour + operation.totals.machinery + operation.totals.inputs;

    const entry = entries.get(block.id) || {
      block,
      operations: [],
      totals: { operations: 0, days: 0, hours: 0, labour: 0, machinery: 0, inputs: 0, cost: 0 },
    };
    entry.operations.push(operation);
    entry.totals.operations += 1;
    entry.totals.days += operation.totals.days;
    entry.totals.hours += operation.totals.hours;
    entry.totals.labour += operation.totals.labour;
    entry.totals.machinery += operation.totals.machinery;
    entry.totals.inputs += operation.totals.inputs;
    entry.totals.cost += operation.totals.cost;
    entries.set(block.id, entry);
  });

  return [...entries.values()]
    .map((entry) => ({
      ...entry,
      operations: entry.operations.sort((a, b) => String(a.date).localeCompare(String(b.date))),
    }))
    .sort((a, b) => a.block.name.localeCompare(b.block.name));
}