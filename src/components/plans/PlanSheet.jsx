import PlanMap, { PLAN_COLORS } from '@/components/plans/PlanMap';
import PlanSheetFrame from '@/components/plans/PlanSheetFrame';
import { fmtLongDate, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function PlanSheet({ title, parcels, missing, orientation = 'landscape', zoom = 50 }) {
  const { t } = useI18n();
  const totalArea = parcels.reduce((total, parcel) => total + (Number(parcel.area) || 0), 0);
  const legendColumns = orientation === 'portrait' ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <PlanSheetFrame orientation={orientation}>
      <div className="plan-sheet">
        <header className="flex flex-none items-end justify-between gap-6 border-b border-[#dfe3d9] pb-4">
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-[#7b8a7c]">{t('plans.sheetTitle')}</p>
            <h2 className="mt-2 font-display text-[27px] leading-none text-[#152018]">{title}</h2>
          </div>
          <div className="flex shrink-0 gap-6 text-right">
            <div>
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#7b8a7c]">{t('common.date')}</p>
              <p className="mt-1 text-[11px] font-medium text-[#152018]">{fmtLongDate()}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#7b8a7c]">{t('plans.parcels')}</p>
              <p className="mt-1 text-[11px] font-medium tabular-nums text-[#152018]">{parcels.length}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#7b8a7c]">{t('plans.totalArea')}</p>
              <p className="mt-1 text-[11px] font-medium tabular-nums text-[#152018]">{fmtNum(totalArea, 2)} ha</p>
            </div>
          </div>
        </header>

        <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-md border border-[#dfe3d9]">
          <PlanMap key={orientation} parcels={parcels} zoom={zoom} />
        </div>

        <footer className="mt-4 max-h-[170px] flex-none overflow-hidden">
          <div className={`grid gap-x-5 gap-y-1 ${legendColumns}`}>
            {parcels.map((parcel, index) => (
              <div key={parcel.id} className="flex items-center gap-1.5 text-[9px] leading-[1.6]">
                <span
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: PLAN_COLORS[index % PLAN_COLORS.length] }}
                />
                <span className="truncate font-medium text-[#152018]">{parcel.name}</span>
                <span className="ms-auto shrink-0 tabular-nums text-[#5c6b5e]">{fmtNum(parcel.area, 2)} ha</span>
              </div>
            ))}
          </div>

          {missing.length > 0 && (
            <p className="mt-2.5 border-t border-[#e7ebe2] pt-2 text-[8.5px] leading-snug text-[#6b7a6e]">
              {t('plans.missingTitle')} : {missing.map((parcel) => parcel.name).join(' · ')}
            </p>
          )}

          <p className="mt-1.5 text-[7.5px] uppercase tracking-[0.18em] text-[#9aa79b]">
            {t('plans.satellite')} · Esri World Imagery
          </p>
        </footer>
      </div>
    </PlanSheetFrame>
  );
}