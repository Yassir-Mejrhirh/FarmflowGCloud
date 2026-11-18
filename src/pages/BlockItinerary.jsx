import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import Segmented from '@/components/Segmented';
import BlockItineraryDetail from '@/components/itinerary/BlockItineraryDetail';
import ItineraryCompareTable from '@/components/itinerary/ItineraryCompareTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchList } from '@/lib/data';
import { buildBlockItinerary } from '@/lib/blockItinerary';
import { buildMachineCosts } from '@/lib/machineryCosts';
import { currentMonthKey, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import ExportMenu from '@/components/ExportMenu';
import { exportExcel, exportPdf } from '@/lib/reportExport';

const monthStart = () => `${currentMonthKey()}-01`;

export default function BlockItinerary() {
  const { t } = useI18n();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayISO());
  const [farmId, setFarmId] = useState('');
  const [view, setView] = useState('detail');
  const [blockId, setBlockId] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [farms, setFarms] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [counts, setCounts] = useState([]);
  const [natures, setNatures] = useState([]);
  const [logs, setLogs] = useState([]);
  const [movements, setMovements] = useState([]);
  const [costReports, setCostReports] = useState([]);
  const [wageRates, setWageRates] = useState([]);
  const [transportRates, setTransportRates] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [blockRows, farmRows, workerRows, machineRows, itemRows, invoiceRows, countRows, natureRows, logRows, costReportRows, movementRows, wageRateRows, transportRateRows] =
        await Promise.all([
          fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
          fetchList(base44.entities.Farm, {}, { sort: 'name' }),
          fetchList(base44.entities.Worker, {}, { sort: 'name' }),
          fetchList(base44.entities.Machine, {}, { sort: 'name' }),
          fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
          fetchList(base44.entities.InputInvoice, {}),
          fetchList(base44.entities.InventoryCount, {}),
          fetchList(base44.entities.TaskNature, {}, { sort: 'name' }),
          fetchList(base44.entities.MaintenanceLog, {}, { sort: '-date' }),
          fetchList(base44.entities.DailyReport, {}, { sort: '-date' }),
          fetchList(base44.entities.StockMovement, {}),
          fetchList(base44.entities.WageRate, {}),
          fetchList(base44.entities.TransportRate, {}),
        ]);
      setBlocks(blockRows);
      setFarms(farmRows);
      setWorkers(workerRows);
      setMachines(machineRows);
      setItems(itemRows);
      setInvoices(invoiceRows);
      setCounts(countRows);
      setNatures(natureRows);
      setLogs(logRows);
      setCostReports(costReportRows);
      setMovements(movementRows);
      setWageRates(wageRateRows);
      setTransportRates(transportRateRows);
    };
    load();
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const query = { date: {} };
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
      const rows = await fetchList(base44.entities.DailyReport, query);
      if (!active) return;
      setReports(rows);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [from, to]);

  const farmName = farms.find((farm) => farm.id === farmId)?.name;
  const scopedReports = useMemo(() => {
    if (!farmName) return reports;
    const ids = new Set(blocks.filter((block) => block.farm === farmName).map((block) => block.id));
    return reports.filter((report) => ids.has(report.block_id));
  }, [reports, farmName, blocks]);

  const machineCosts = useMemo(
    () => buildMachineCosts({ machines, logs, reports: costReports, items, invoices, counts, movements }),
    [machines, logs, costReports, items, invoices, counts, movements],
  );

  const entries = useMemo(
    () =>
      buildBlockItinerary({
        reports: scopedReports,
        blocks,
        workers,
        machines,
        items,
        invoices,
        movements,
        counts,
        wageRates,
        transportRates,
        machineCosts,
      }),
    [scopedReports, blocks, workers, machines, items, invoices, movements, counts, wageRates, transportRates, machineCosts],
  );

  const activeEntry = entries.find((entry) => entry.block.id === blockId) || entries[0];

  const exportBase = t('itt.title');
  const exportColumns = [
    { key: 'block', label: t('itt.block'), width: 24 },
    { key: 'farm', label: t('exp.colFarm'), width: 20 },
    { key: 'operations', label: t('itt.operations'), digits: 0, align: 'end', width: 12 },
    { key: 'days', label: t('itt.days'), digits: 1, align: 'end', width: 10 },
    { key: 'hours', label: t('itt.hours'), digits: 1, align: 'end', width: 10 },
    { key: 'labour', label: t('itt.labour'), money: true, align: 'end', width: 16 },
    { key: 'transport', label: t('itt.transport'), money: true, align: 'end', width: 16 },
    { key: 'machinery', label: t('itt.machinery'), money: true, align: 'end', width: 16 },
    { key: 'inputs', label: t('itt.inputs'), money: true, align: 'end', width: 16 },
    { key: 'cost', label: t('itt.totalCost'), money: true, align: 'end', width: 16 },
    { key: 'perHa', label: t('itt.costPerHa'), money: true, align: 'end', width: 14 },
  ];
  const exportRows = entries.map((entry) => {
    const area = Number(entry.block.area_ha) || 0;
    return {
      block: entry.block.name,
      farm: entry.block.farm || '',
      operations: entry.totals.operations,
      days: entry.totals.days,
      hours: entry.totals.hours,
      labour: entry.totals.labour,
      transport: entry.totals.transport || 0,
      machinery: entry.totals.machinery,
      inputs: entry.totals.inputs,
      cost: entry.totals.cost,
      perHa: area > 0 ? entry.totals.cost / area : '',
    };
  });
  const exportSubtitle = [
    t('exp.period', { from: from || '—', to: to || '—' }),
    farmName || t('itt.allFarms'),
  ].join(' · ');
  const runExcel = () => exportExcel({ base: exportBase, columns: exportColumns, rows: exportRows });
  const runPdf = () =>
    exportPdf({ base: exportBase, title: exportBase, subtitle: exportSubtitle, columns: exportColumns, rows: exportRows });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('itt.eyebrow')}
        title={t('itt.title')}
        description={t('itt.description')}
        action={<ExportMenu hasData={exportRows.length > 0} disabled={loading} onExcel={runExcel} onPdf={runPdf} />}
      />

      <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t('lab.from')}>
            <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t('lab.to')}>
            <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label={t('report.farm')}>
            <SelectField
              value={farmId}
              onChange={setFarmId}
              options={farms.map((farm) => ({ value: farm.id, label: farm.name }))}
              noneLabel={t('itt.allFarms')}
            />
          </Field>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => {
                setFrom(monthStart());
                setTo(todayISO());
              }}
            >
              {t('lab.thisMonth')}
            </Button>
          </div>
        </div>
      </section>

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'detail', label: t('itt.viewDetail') },
          { value: 'compare', label: t('itt.viewCompare') },
        ]}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : entries.length === 0 ? (
        <EmptyState icon={MapPin} title={t('itt.emptyTitle')} description={t('itt.emptyDesc')} />
      ) : view === 'compare' ? (
        <ItineraryCompareTable
          entries={[...entries].sort((a, b) => b.totals.cost - a.totals.cost)}
          onSelect={(id) => {
            setBlockId(id);
            setView('detail');
          }}
        />
      ) : (
        <div className="space-y-4">
          <Field label={t('itt.block')}>
            <SelectField
              value={activeEntry?.block.id}
              onChange={setBlockId}
              options={entries.map((entry) => ({
                value: entry.block.id,
                label: entry.block.farm ? `${entry.block.name} — ${entry.block.farm}` : entry.block.name,
              }))}
            />
          </Field>
          <BlockItineraryDetail entry={activeEntry} natures={natures} />
        </div>
      )}
    </div>
  );
}