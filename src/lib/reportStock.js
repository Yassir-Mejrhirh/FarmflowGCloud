// Stock leaving the store for one report: consumed inputs plus the fuel and
// lubricant drawn for each machine. Quantities of the same input are merged, so a
// fuel item entered both as an input and as machine fuel leaves the store once.
export function buildReportOutflow(inputs = [], machinery = []) {
  const rows = new Map();

  const add = (itemId, quantity) => {
    if (!itemId || !(quantity > 0)) return null;
    const row = rows.get(itemId) || { item_id: itemId, quantity: 0, machine_id: '' };
    row.quantity += quantity;
    rows.set(itemId, row);
    return row;
  };

  inputs.forEach((line) => add(line.item_id, Number(line.quantity) || 0));

  machinery.forEach((line) => {
    const drawn = [
      add(line.fuel_item_id, Number(line.fuel_quantity) || 0),
      add(line.lubricant_item_id, Number(line.lubricant_quantity) || 0),
    ];
    drawn.forEach((row) => {
      if (row && line.machine_id && Number(line.hours) > 0) row.machine_id = line.machine_id;
    });
  });

  return [...rows.values()];
}