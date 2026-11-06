import { Boxes, Tractor, Users } from 'lucide-react';
import StatCard from '@/components/StatCard';
import OperationCard from '@/components/itinerary/OperationCard';
import { fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function BlockItineraryDetail({ entry, natures = [] }) {
  const { t } = useI18n();
  const totals = entry.totals;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('itt.operations')} value={totals.operations} tone="moss" />
        <StatCard label={t('itt.days')} value={fmtNum(totals.days, 1)} tone="sand" />
        <StatCard label={t('itt.hours')} value={fmtNum(totals.hours, 1)} tone="sand" />
        <StatCard label={t('itt.totalCost')} value={fmtMoney(totals.cost)} tone="clay" />
      </div>

      <section className="rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4">
        <div className="mb-3">
          <h2 className="font-display text-lg tracking-tight">{t('itt.detailTitle')}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t('itt.detailDesc')}</p>
        </div>
        <ul className="space-y-2">
          {entry.operations.map((operation) => (
            <OperationCard key={operation.id} operation={operation} natures={natures} />
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4">
        <h2 className="font-display text-lg tracking-tight">{t('itt.totalsTitle')}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-background/40 p-3">
            <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <Users className="h-3 w-3" /> {t('itt.labour')}
            </dt>
            <dd className="mt-1 font-medium tabular-nums">{fmtMoney(totals.labour)}</dd>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-3">
            <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <Tractor className="h-3 w-3" /> {t('itt.machinery')}
            </dt>
            <dd className="mt-1 font-medium tabular-nums">{fmtMoney(totals.machinery)}</dd>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/40 p-3">
            <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <Boxes className="h-3 w-3" /> {t('itt.inputs')}
            </dt>
            <dd className="mt-1 font-medium tabular-nums">{fmtMoney(totals.inputs)}</dd>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t('itt.totalCost')}</dt>
            <dd className="mt-1 font-display text-lg tracking-tight tabular-nums">{fmtMoney(totals.cost)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}