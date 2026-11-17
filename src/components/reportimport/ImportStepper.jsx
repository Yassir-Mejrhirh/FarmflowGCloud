import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/I18nContext';

export default function ImportStepper({ step, steps }) {
  const { t } = useI18n();

  return (
    <ol className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {steps.map((key, index) => {
        const number = index + 1;
        const active = number === step;
        const done = number < step;
        return (
          <li key={key} className="flex items-center gap-2 text-[12px]">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border text-[11px] tabular-nums transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : done
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground',
              )}
            >
              {number}
            </span>
            <span className={cn(active ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              {t(key)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}