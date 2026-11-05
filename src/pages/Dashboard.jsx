import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, PackageSearch, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import OverviewGroups from '@/components/dashboard/OverviewGroups';
import { fetchList } from '@/lib/data';
import { buildInputTotals } from '@/lib/inventory';
import { fmtLongDate, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function Dashboard() {
  const { t } = useI18n();
  const [blocks, setBlocks] = useState([]);
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState({});

  const load = async () => {
    const [blockRows, itemRows, invoiceRows] = await Promise.all([
      fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
      fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
      fetchList(base44.entities.InputInvoice, {}),
    ]);
    setBlocks(blockRows);
    setItems(itemRows);
    setPurchases(buildInputTotals(invoiceRows));
  };

  useEffect(() => {
    load();
  }, []);

  const dateLabel = fmtLongDate();
  const lowStock = items.filter(
    (item) => item.min_stock_enabled && (purchases[item.id]?.quantity || 0) <= (Number(item.min_stock) || 0),
  );

  return (
    <div className="space-y-10">
      <PageHeader eyebrow={dateLabel} />

      <OverviewGroups />

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
    </div>
  );
}