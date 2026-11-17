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
  // Transport switched off on the card stops the cost, whatever the dated history holds.
  if (worker?.transport_enabled === false) {
    return { mode: 'none', rate: 0, transporter: '', team: '' };
  }
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

// Transporter names are compared ignoring case and extra spaces.
export function normalizeTransporterName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// One transporter only serves one team. The transport in force today on the other
// workers' cards is checked, so a rate revised with a date keeps working as expected.
export function transporterTeamConflicts({ transporter, team, workers = [], rates = [], excludeWorkerId }) {
  const name = normalizeTransporterName(transporter);
  if (!name) return [];
  const targetTeam = normalizeTransporterName(team);
  const index = buildTransportIndex(rates);
  const date = new Date().toISOString().slice(0, 10);
  return workers
    .filter((worker) => worker?.id && worker.id !== excludeWorkerId)
    .map((worker) => ({ worker, transport: transportFor(worker, index, date) }))
    .filter(({ transport }) => transport.mode !== 'none' && normalizeTransporterName(transport.transporter) === name)
    .filter(({ transport }) => normalizeTransporterName(transport.team) !== targetTeam)
    .map(({ worker, transport }) => ({ workerName: worker.name || '', team: transport.team || '' }));
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
// that team worked on that day. The pointage days not carried into a report yet are
// valued the same way, after the reports, so a fixed amount is never paid twice.
export function buildTransportCosts({ reports = [], entries = [], workers = [], rates = [] }) {
  const index = buildTransportIndex(rates);
  const workerMap = new Map(workers.map((worker) => [worker.id, worker]));
  const paidFixed = new Set();
  let transportTotal = 0;
  const lines = [];
  const byReport = new Map();
  const byWorker = new Map();
  const byDate = new Map();
  const byDateWorker = new Map();
  const transporters = new Map();

  const addLine = ({ reportId, date, workerId, days, transport }) => {
    const rate = transport.rate;
    if (transport.mode === 'none' || rate <= 0) return;

    let cost;
    if (transport.mode === 'fixed') {
      const scope = `${date}|${transport.transporter || workerId}|${transport.team}`;
      cost = paidFixed.has(scope) ? 0 : rate;
      paidFixed.add(scope);
    } else {
      cost = rate * days;
    }

    transportTotal += cost;
    if (reportId) byReport.set(reportId, num(byReport.get(reportId)) + cost);
    byWorker.set(workerId, num(byWorker.get(workerId)) + cost);
    byDate.set(date, num(byDate.get(date)) + cost);
    const dateKey = `${date}|${workerId}`;
    byDateWorker.set(dateKey, num(byDateWorker.get(dateKey)) + cost);

    const scopeKey =
      transport.mode === 'fixed'
        ? `${transport.transporter || `worker-${workerId}`}|${transport.team}|fixed`
        : `${transport.transporter || `worker-${workerId}`}|per_person`;
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
    current.dates.add(date);
    current.total += cost;
    transporters.set(scopeKey, current);

    lines.push({
      reportId: reportId || '',
      date,
      workerId,
      workerName: workerMap.get(workerId)?.name || '',
      transporter: transport.transporter,
      mode: transport.mode,
      rate,
      days,
      cost,
    });
  };

  [...reports]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)))
    .forEach((report) => {
      (report.labour || []).forEach((line) => {
        const days = num(line.days);
        if (!line.worker_id || days <= 0) return;
        const worker = workerMap.get(line.worker_id);
        addLine({
          reportId: report.id,
          date: report.date,
          workerId: line.worker_id,
          days,
          transport: transportLine(line, worker, index, report.date),
        });
      });
    });

  [...entries]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach((entry) => {
      const days = num(entry.days);
      if (!entry.workerId || days <= 0) return;
      addLine({
        date: entry.date,
        workerId: entry.workerId,
        days,
        transport: transportFor(workerMap.get(entry.workerId), index, entry.date),
      });
    });

  return {
    index,
    lines,
    byReport,
    byWorker,
    byDate,
    byDateWorker,
    total: transportTotal,
    transporters: [...transporters.values()]
      .map((entry) => ({ ...entry, dates: entry.dates.size }))
      .sort((a, b) => b.total - a.total),
  };
}