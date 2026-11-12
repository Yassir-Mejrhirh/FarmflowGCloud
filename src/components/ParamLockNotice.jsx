import { Lock } from 'lucide-react';
import { usageLabel } from '@/lib/paramUsage';
import { useI18n } from '@/lib/I18nContext';

export default function ParamLockNotice({ usage, note }) {
  const { t } = useI18n();
  if (!usage?.length) return null;

  return (
    <div className="rounded-xl border border-clay/40 bg-clay/10 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-clay">
        <Lock className="h-3.5 w-3.5" strokeWidth={1.9} /> {t('paramLock.title')}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {t('paramLock.body', { list: usageLabel(usage, t) })}
      </p>
      {note && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{note}</p>}
    </div>
  );
}