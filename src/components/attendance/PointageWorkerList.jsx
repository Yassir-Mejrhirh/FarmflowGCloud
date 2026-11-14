import PointageGroup from '@/components/attendance/PointageGroup';
import { useI18n } from '@/lib/I18nContext';

// The workers of the pointage, the farm's own first, then one section per team.
export default function PointageWorkerList({ groups, days, onChange, onFillGroup, onClearGroup }) {
  const { t } = useI18n();

  if (!groups.length) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        {t('att.noWorkers')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <PointageGroup
          key={group.key}
          group={group}
          days={days}
          onChange={onChange}
          onFillGroup={onFillGroup}
          onClearGroup={onClearGroup}
        />
      ))}
    </div>
  );
}