import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, Coins, ListChecks, MapPin, PackageSearch, Users, ChevronRight,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import OverviewGroups from '@/components/dashboard/OverviewGroups';
import StatCard from '@/components/StatCard';
import StatusPill from '@/components/StatusPill';
import { fetchList, byId, sumBy } from '@/lib/data';
import { getMonthlyCosts } from '@/lib/costs';
import { buildInputTotals } from '@/lib/inventory';
import { currentMonthKey, fmtLongDate, fmtMoney, fmtNum, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const STATUS_TONE = { active: 'moss', preparing: 'amber', harvest: 'clay', fallow: 'stone' };

export default function Dashboard() {
  const { t } = useI18n();
  const [blocks, setBlocks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [items, setItems] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [crops, setCrops] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [spend, setSpend] = useState(0);
  const [purchases, setPurchases] = useState({});

  const load = async () => {
    const today = todayISO();
    const [blockRows, taskRows, itemRows, workerRows, logRows, costs, cropRows, varietyRows, invoiceRows] = await Promise.all([
      fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
      fetchList(base44.entities.Task, {}, { sort: 'created_date' }),
      fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
      fetchList(base44.entities.Worker, {}),
      fetchList(base44.entities.Attendance, { date: today }),
      getMonthlyCosts(currentMonthKey()),
      fetchList(base44.entities.Crop, {}),
      fetchList(base44.entities.Variety, {}),
      fetchList(base44.entities.InputInvoice, {}),
    ]);
    setBlocks(blockRows);
    setTasks(taskRows);
    setItems(itemRows);
    setWorkers(workerRows);
    setTodayLogs(logRows);
    setSpend(costs.total);
    setCrops(cropRows);
    setVarieties(varietyRows);
    setPurchases(buildInputTotals(invoiceRows));
  };

  useEffect(() => {
    load();
  }, []);

  const cropMap = useMemo(() => byId(crops), [crops]);
  const varietyMap = useMemo(() => byId(varieties), [varieties]);

  const dateLabel = fmtLongDate();
  const mappedArea = sumBy(blocks, 'area_ha');
  const lowStock = items.filter(
    (item) => item.min_stock_enabled && (purchases[item.id]?.quantity || 0) <= (Number(item.min_stock) || 0),
  );
  const crewToday = new Set(todayLogs.map((log) => log.worker_id)).size;
  const activeWorkers = workers.filter((worker) => worker.active !== false).length;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={dateLabel}
        title={t('dash.title')}
        description={t('dash.description')}
      />

      <OverviewGroups />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={MapPin}
          label={t('dash.mappedArea')}
          value={`${fmtNum(mappedArea, 2)} ha`}
          hint={t('dash.blocksGeoref', { n: blocks.length })}
          tone="moss"
        />
        <StatCard
          icon={ListChecks}
          label={t('dash.catalogTasks')}
          value={tasks.length}
          hint={t('dash.catalogHint')}
          tone="clay"
        />
        <StatCard
          icon={Users}
          label={t('dash.crewToday')}
          value={crewToday}
          hint={t('dash.activeRoster', { n: activeWorkers })}
          tone="sand"
        />
        <StatCard
          icon={Coins}
          label={t('dash.spendMonth')}
          value={fmtMoney(spend)}
          hint={t('dash.spendHint')}
          tone="sand"
        />
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <div className="flex items-center gap-2">
            <PackageSearch className="h-4 w-4 text-clay" strokeWidth={1.8} />
            <h2 className="font-display text-lg tracking-tight">{t('dash.runningLow')}</h2>
          </div>
          {lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t('dash.allAboveMin')}</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {lowStock.slice(0, 3).map((item) => {
                const onHand = purchases[item.id]?.quantity || 0;
                const level = item.min_stock
                  ? Math.min(100, Math.round((onHand / Number(item.min_stock)) * 100))
                  : 100;
                return (
                  <li key={item.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm">{item.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {fmtNum(onHand, 1)} {item.unit}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-clay" style={{ width: `${Math.max(level, 4)}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t('dash.minimum')} {fmtNum(item.min_stock, 0)} {item.unit}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <Link to="/inventory" className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            {t('dash.openInventory')} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Link
          to="/blocks"
          className="group block rounded-2xl bg-primary p-5 text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/60">{t('dash.georef')}</p>
          <p className="mt-2 font-display text-xl leading-snug">
            {t('dash.blocksDrawn', { n: blocks.length })}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-primary-foreground/70">
            {t('dash.traceHint')}
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium">
            {t('dash.plotNewBlock')}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl tracking-tight">{t('dash.blocksInSeason')}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t('dash.areaMeasured')}</p>
          </div>
          <Link to="/blocks" className="text-xs font-medium text-primary hover:underline">
            {t('dash.manageBlocks')}
          </Link>
        </div>
        {blocks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">{t('dash.noBlocksYet')}</p>
            <Link to="/blocks" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
              {t('dash.openBlocks')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {blocks.map((block) => (
              <Link
                key={block.id}
                to="/blocks"
                className="rounded-2xl border border-border/70 bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-38px_rgba(20,45,35,0.9)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base leading-tight">{block.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {block.code || t('dash.block')}
                    </p>
                  </div>
                  <StatusPill tone={STATUS_TONE[block.status] || 'stone'}>
                    {t(`st.${block.status}`) || t('dash.block')}
                  </StatusPill>
                </div>
                <p className="mt-5 truncate text-sm text-muted-foreground">
                  {cropMap[block.crop_id]
                    ? `${cropMap[block.crop_id].name}${varietyMap[block.variety_id] ? ` · ${varietyMap[block.variety_id].name}` : ''}`
                    : t('common.noCropAssigned')}
                </p>
                <p className="mt-2 font-display text-2xl leading-none tabular-nums">
                  {fmtNum(block.area_ha, 2)} <span className="text-sm font-normal text-muted-foreground">ha</span>
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}