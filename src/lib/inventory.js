// Quantities and purchase value per input, derived from the invoice lines.
export function buildInputTotals(invoices = []) {
  const totals = {};
  invoices.forEach((invoice) => {
    (invoice.lines || []).forEach((line) => {
      if (!line.item_id) return;
      const quantity = Number(line.quantity) || 0;
      const cost = quantity * (Number(line.unit_price) || 0);
      const row = totals[line.item_id] || { quantity: 0, cost: 0 };
      row.quantity += quantity;
      row.cost += cost;
      totals[line.item_id] = row;
    });
  });
  return totals;
}

// On-hand quantity per input: purchases from invoices minus stock-out movements.
export function buildOnHand(invoices = [], movements = []) {
  const totals = buildInputTotals(invoices);
  const onHand = {};
  Object.entries(totals).forEach(([itemId, row]) => {
    onHand[itemId] = { ...row };
  });
  movements.forEach((movement) => {
    if (!movement.item_id || movement.kind !== 'out') return;
    const row = onHand[movement.item_id] || { quantity: 0, cost: 0 };
    row.quantity -= Number(movement.quantity) || 0;
    onHand[movement.item_id] = row;
  });
  return onHand;
}

// Weighted average purchase price (prix moyen pondéré).
export function avgCostOf(totals, itemId) {
  const row = totals[itemId];
  return row && row.quantity ? row.cost / row.quantity : 0;
}