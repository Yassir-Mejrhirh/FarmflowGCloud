import { LANGUAGES, useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function LanguageSwitcher({ className }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div className={cn('inline-flex items-center gap-1 rounded-xl border border-border/70 bg-card p-1', className)}>
      {LANGUAGES.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLang(option.value)}
          aria-label={t('lang.switch')}
          className={cn(
            'rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors',
            lang === option.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}