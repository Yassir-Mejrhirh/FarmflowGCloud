// Export grid of the labour status, laid out like the screen: the same groups in the
// same order (fixed workers by farm, then teams under their name, then mobile workers
// without a team), each group under a visible title, and the transporters listed apart,
// one line each, after the groups of workers.

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
const dayKey = (index) => `d${index}`;
const dayLabel = (date) => `${String(date).slice(8)}/${String(date).slice(5, 7)}`;

function transporterLabel(entry, t) {
  const mode = entry.mode === 'per_person' ? t('lab.modePerPerson') : t('lab.modeFixed');
  const note = entry.team ? t('lab.transportTeam', { team: entry.team }) : '';
  return [entry.name || t('lab.unknownTransporter'), mode, note].filter(Boolean).join(' · ');
}

// marks: true writes X / O in the day columns, as on screen; false writes 1 / 0, which
// Excel keeps as numbers.
export function buildLabourExport({ groups = [], days = [], transporters = [], t, marks = false }) {
  const columns = [
    { key: 'name', label: t('lab.fullName'), width: 38 },
    { key: 'rate', label: t('lab.salaryDay'), money: true, align: 'end', width: 16 },
    ...days.map((_date, index) => ({
      key: dayKey(index),
      label: dayLabel(_date),
      digits: 0,
      align: 'end',
      width: 6,
    })),
    { key: 'days', label: t('lab.totalDays'), digits: 1, align: 'end', width: 14 },
    { key: 'total', label: t('lab.totalPay'), money: true, align: 'end', width: 18 },
  ];

  const row = (values) => ({ name: '', rate: '', days: '', total: '', ...values });
  const rows = [];

  groups.forEach((group) => {
    const workers = (group.rows || []).filter((line) => !line.transporter);
    if (!workers.length) return;

    // Group title: the farm, the team with its name, or "sans équipe".
    rows.push(
      row({
        name: group.label,
        days: round(workers.reduce((sum, line) => sum + (Number(line.days) || 0), 0)),
        total: round(group.wages),
      }),
    );

    workers.forEach((line) => {
      const values = row({
        name: line.job ? `${line.name} · ${line.job}` : line.name,
        rate: line.salary ? round(line.salary) : '',
        days: round(line.days),
        total: round(line.total),
      });
      days.forEach((date, index) => {
        const worked = (line.dates.get(date) || 0) > 0;
        values[dayKey(index)] = marks ? (worked ? 'X' : 'O') : worked ? 1 : 0;
      });
      rows.push(values);
    });
  });

  if (transporters.length) {
    rows.push(row({ name: t('lab.transporters') }));
    transporters.forEach((entry) => {
      rows.push(
        row({
          name: transporterLabel(entry, t),
          rate: entry.rate ? round(entry.rate) : '',
          days: round(entry.dates),
          total: round(entry.total),
        }),
      );
    });
  }

  return { columns, rows };
}