import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import TrackingSection from '@/components/machinery/tracking/TrackingSection';
import VidangeList from '@/components/machinery/tracking/VidangeList';
import MaintenanceList from '@/components/machinery/tracking/MaintenanceList';
import WorkTypeList from '@/components/machinery/tracking/WorkTypeList';
import ChmpEvolution from '@/components/machinery/tracking/ChmpEvolution';
import { cn } from '@/lib/utils';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

function Tile({ label, value }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-2.5 py-2">
      <dt className="truncate text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm tabular-nums">{value}</dd>
    </div>
  );
}

export default function MachineTrackingCard({ row }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const last = row.vidanges[0];

  return (
    <article className={cn('rounded-2xl border bg-card', open ? 'border-border' : 'border-border/70')}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-start"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {t('mtr.counter')} : {fmtNum(row.counter, 0)} h · {t('mtr.lastVidange')} :{' '}
            {last ? `${fmtDate(last.date)} · ${fmtNum(last.since, 0)} h` : '—'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-end">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{t('mtr.chmp')}</p>
            <p className="text-sm font-medium tabular-nums">{row.chmp === null ? '—' : fmtMoney(row.chmp)}</p>
          </div>
          <ChevronDown
            className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
          />
        </div>
      </button>

      <dl className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-4">
        <Tile label={t('mtr.hours')} value={`${fmtNum(row.hours, 1)} h`} />
        <Tile
          label={t('mtr.fuel')}
          value={`${fmtNum(row.fuelQuantity, 1)}${row.fuelUnit ? ` ${row.fuelUnit}` : ''}`}
        />
        <Tile
          label={t('mtr.fuelPerHour')}
          value={row.fuelPerHour === null ? '—' : `${fmtNum(row.fuelPerHour, 2)}${row.fuelUnit ? ` ${row.fuelUnit}` : ''}`}
        />
        <Tile label={t('mtr.maintenanceCost')} value={fmtMoney(row.maintenanceCost)} />
      </dl>

      {open && (
        <div className="grid gap-5 border-t border-border/60 px-4 py-4 lg:grid-cols-2">
          <TrackingSection
            title={t('mtr.vidanges')}
            empty={row.vidanges.length === 0 ? t('mtr.vidangeEmpty') : null}
          >
            <VidangeList rows={row.vidanges} />
          </TrackingSection>

          <TrackingSection
            title={t('mtr.maintenance')}
            empty={row.maintenance.length === 0 ? t('mtr.maintenanceEmpty') : null}
          >
            <MaintenanceList rows={row.maintenance} />
          </TrackingSection>

          <TrackingSection
            title={t('mtr.works')}
            empty={row.works.length === 0 ? t('mtr.worksEmpty') : null}
          >
            <WorkTypeList rows={row.works} />
          </TrackingSection>

          <TrackingSection title={t('mtr.chmpEvolution')}>
            <ChmpEvolution rows={row.months} />
          </TrackingSection>
        </div>
      )}
    </article>
  );
}