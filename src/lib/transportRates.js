const num = (value) => Number(value) || 0;

// Dated transport rates grouped by worker, oldest first, so the rate in force on a
// date is found by walking the list until the dates pass it.
export function buildTransportIndex(rates = []) {
  const index = new Map();
  [...rates]
    .filter((rate) => rate?.worker_id && rate.effective_date)
    .sort((a, b) => String(a.effective_date).localeCompare(String(b.effective_date)))
    .forEach((rate) => {
      const list = index.get(rate.worker_id) || [];
      list.push(rate);
      index.set(rate.worker_id, list);
    });
  return index;
}

export function transportRateOn(index, workerId, date) {
  const list = index?.get(workerId) || [];
  let found = null;
  list.forEach((rate) => {
    if (!date || String(rate.effective_date) <= String(date)) found = rate;
  });
  return found;
}

// Transport in force on a date: the dated rate, or the worker's own settings when
// nothing was recorded in the history yet.
export function transportFor(worker, index, date) {
  const dated = transportRateOn(index, worker?.id, date);
  if (dated) {
    return {
      mode: dated.mode || 'fixed',
      rate: num(dated.rate),
      transporter: dated.transporter_name || '',
      team: dated.team || worker?.team || '',
    };
  }
  if (!worker?.transport_enabled || !num(worker?.transport_rate)) {
    return { mode: 'none', rate: 0, transporter: '', team: '' };
  }
  return {
    mode: worker.transport_rate_type || 'fixed',
    rate: num(worker.transport_rate),
    transporter: worker.transporter_name || '',
    team: worker.team || '',
  };
}

// Values frozen on the report line win, so revising a transport rate never rewrites
// the cost already recorded.
export function transportLine(line, worker, index, date) {
  const stored = line?.transport_mode;
  if (stored !== undefined && stored !== null && stored !== '') {
    return {
      mode: stored,
      rate: num(line.transport_rate),
      transporter: line.transporter_name || '',
      team: line.transport_team || '',
    };
  }
  return transportFor(worker, index, date);
}

// Transport cost of every labour line of a set of daily reports.
// A per-person transport is paid for every day worked; a fixed transport is paid
// once per day for the transporter and the team, whatever the number of parcels
// that team worked on that day.
export function buildTransportCosts({ reports = [], workers = [], rates = [] }) {
  const index = buildTransportIndex(rates);
  const workerMap = new Map(workers.map((worker) => [worker.id, worker]));
  const paidFixed = new Set();
  const lines = [];
  const byReport = new Map();
  const byWorker = new Map();
  const byDate = new Map();
  const byDateWorker = new Map();
  const transporters = new Map();

  [...reports]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)))
    .forEach((report) => {
      (report.labour || []).forEach((line) => {
        const days = num(line.days);
        if (!line.worker_id || days <= 0) return;
        const worker = workerMap.get(line.worker_id);
        const transport = transportLine(line, worker, index, report.date);
        const rate = transport.rate;
        if (transport.mode === 'none' || rate <= 0) return;

        let cost;
        if (transport.mode === 'fixed') {
          const scope = `${report.date}|${transport.transporter || line.worker_id}|${transport.team}`;
          cost = paidFixed.has(scope) ? 0 : rate;
          paidFixed.add(scope);
        } else {
          cost = rate * days;
        }

        byReport.set(report.id, num(byReport.get(report.id)) + cost);
        byWorker.set(line.worker_id, num(byWorker.get(line.worker_id)) + cost);
        byDate.set(report.date, num(byDate.get(report.date)) + cost);
        const dateKey = `${report.date}|${line.worker_id}`;
        byDateWorker.set(dateKey, num(byDateWorker.get(dateKey)) + cost);

        const scopeKey =
          transport.mode === 'fixed'
            ? `${transport.transporter || `worker-${line.worker_id}`}|${transport.team}|fixed`
            : `${transport.transporter || `worker-${line.worker_id}`}|per_person`;
        const current = transporters.get(scopeKey) || {
          key: scopeKey,
          name: transport.transporter || '',
          mode: transport.mode,
          team: transport.mode === 'fixed' ? transport.team : '',
          rate,
          days: 0,
          dates: new Set(),
          total: 0,
        };
        current.rate = rate;
        current.days += days;
        current.dates.add(report.date);
        current.total += cost;
        transporters.set(scopeKey, current);

        lines.push({
          reportId: report.id,
          date: report.date,
          workerId: line.worker_id,
          workerName: worker?.name || '',
          transporter: transport.transporter,
          mode: transport.mode,
          rate,
          days,
          cost,
        });
      });
    });

  return {
    index,
    lines,
    byReport,
    byWorker,
    byDate,
    byDateWorker,
    total: [...byReport.values()].reduce((sum, value) => sum + value, 0),
    transporters: [...transporters.values()]
      .map((entry) => ({ ...entry, dates: entry.dates.size }))
      .sort((a, b) => b.total - a.total),
  };
}