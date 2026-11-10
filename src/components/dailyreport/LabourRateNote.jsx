import { fmtMoney } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { labourRate } from '@/lib/wageRates';

export default function LabourRateNote({ line, worker, rateIndex, date }) {
  const { t } = useI18n();
  if (!worker) return null;

  const rate = labourRate(line, worker, rateIndex, date);
  return (
    <p className="text-[11px] text-muted-foreground tabular-nums">
      {fmtMoney(rate)} / {t('report.days')}
    </p>
  );
}