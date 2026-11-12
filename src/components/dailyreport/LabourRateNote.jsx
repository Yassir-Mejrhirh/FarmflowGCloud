import { fmtMoney } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { labourRate } from '@/lib/wageRates';
import { transportLine } from '@/lib/transportRates';

export default function LabourRateNote({ line, worker, rateIndex, transportIndex, date }) {
  const { t } = useI18n();
  if (!worker) return null;

  const rate = labourRate(line, worker, rateIndex, date);
  const transport = transportLine(line, worker, transportIndex, date);
  const billed = transport.mode !== 'none' && transport.rate > 0;

  return (
    <p className="text-[11px] text-muted-foreground tabular-nums">
      {fmtMoney(rate)} / {t('report.days')}
      {billed && (
        <span className="ms-2 text-clay">
          {t('lab.transport')} {fmtMoney(transport.rate)}
          {transport.mode === 'per_person' ? ` / ${t('lab.perPerson')}` : ` / ${t('lab.perDay')}`}
        </span>
      )}
    </p>
  );
}