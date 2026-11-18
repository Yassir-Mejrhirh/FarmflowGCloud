import { buildStockPmpIndex } from '@/lib/inventory';
import { isMachineConsumableItem } from '@/lib/machineryCosts';
import { buildRateIndex, labourRate } from '@/lib/wageRates';
import { buildTransportCosts } from '@/lib/transportRates';

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
  movements = [],
  counts = [],
  wageRates = [],
  transportRates = [],
  machineCosts = {},
}) {
  // Le coût d'un intrant est valorisé au PMP en vigueur à la date du rapport : les achats,
  // sorties et inventaires postérieurs ne modifient pas un rapport déjà écrit.
  const pmpAt = buildStockPmpIndex({ invoices, movements, counts });
  const rateIndex = buildRateIndex(wageRates);
  // Transport of every operation: per-person for each day worked, or a fixed amount
  // once for the transporter and the team of the day.
  const transportCosts = buildTransportCosts({ reports, workers, rates: transportRates });
  const consumableIds = new Set(items.filter(isMachineConsumableItem).map((item) => item.id));
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
        // The rate written with the report wins, so revising a wage never rewrites past costs.
        const rate = labourRate(line, worker, rateIndex, report.date);
        return { key: line.worker_id, name: worker?.name || '', days, rate, cost: days * rate };
      });

    const machinery = (report.machinery || [])
      .filter((line) => line.machine_id && (num(line.hours) > 0 || num(line.fuel_quantity) > 0))
      .map((line, index) => {
        const machine = machineMap.get(line.machine_id);
        const fuelItem = itemMap.get(line.fuel_item_id);
        const hours = num(line.hours);
        // Weighted hourly cost of the machine (maintenance, repairs and fuel spread
        // over its logged hours), the same basis as the machinery page.
        const rate = num(machineCosts[line.machine_id]?.hourly) || num(machine?.hourly_rate);
        const quantity = num(line.fuel_quantity);
        return {
          key: `${line.machine_id}-${index}`,
          name: machine?.name || '',
          hours,
          rate,
          fuel:
            line.fuel_item_id && quantity > 0
              ? {
                  key: line.fuel_item_id,
                  name: fuelItem?.name || '',
                  unit: fuelItem?.unit || '',
                  quantity,
                }
              : null,
          cost: hours * rate,
        };
      });

    // Fuels and lubricants are already inside the machine cost (hours × hourly cost),
    // so they are not charged again as a direct input of the parcel.
    const machineHours = machinery.reduce((sum, line) => sum + line.hours, 0);

    const inputs = (report.inputs || [])
      .filter((line) => line.item_id && num(line.quantity) > 0)
      .filter((line) => !(machineHours > 0 && consumableIds.has(line.item_id)))
      .map((line) => {
        const item = itemMap.get(line.item_id);
        const quantity = num(line.quantity);
        const unitCost = pmpAt(line.item_id, report.date);
        return {
          key: line.item_id,
          name: item?.name || '',
          unit: item?.unit || '',
          quantity,
          unitCost,
          cost: quantity * unitCost,
        };
      });

    const transportRows = new Map();
    transportCosts.lines.forEach((line) => {
      if (line.reportId !== report.id) return;
      const key = `${line.transporter || line.workerId}-${line.mode}`;
      const row = transportRows.get(key) || {
        key,
        name: line.transporter || workerMap.get(line.workerId)?.name || '',
        mode: line.mode,
        rate: line.rate,
        amount: 0,
      };
      row.amount += line.cost;
      transportRows.set(key, row);
    });
    const transport = [...transportRows.values()];

    const operation = {
      id: report.id,
      date: report.date,
      operation: report.operation,
      description: report.description || '',
      labour,
      transport,
      machinery,
      inputs,
      totals: {
        labour: labour.reduce((sum, line) => sum + line.cost, 0),
        transport: transport.reduce((sum, line) => sum + line.amount, 0),
        machinery: machinery.reduce((sum, line) => sum + line.cost, 0),
        inputs: inputs.reduce((sum, line) => sum + line.cost, 0),
        days: labour.reduce((sum, line) => sum + line.days, 0),
        hours: machinery.reduce((sum, line) => sum + line.hours, 0),
      },
    };
    operation.totals.cost =
      operation.totals.labour + operation.totals.transport + operation.totals.machinery + operation.totals.inputs;

    const entry = entries.get(block.id) || {
      block,
      operations: [],
      totals: { operations: 0, days: 0, hours: 0, labour: 0, transport: 0, machinery: 0, inputs: 0, cost: 0 },
    };
    entry.operations.push(operation);
    entry.totals.operations += 1;
    entry.totals.days += operation.totals.days;
    entry.totals.hours += operation.totals.hours;
    entry.totals.labour += operation.totals.labour;
    entry.totals.transport += operation.totals.transport;
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