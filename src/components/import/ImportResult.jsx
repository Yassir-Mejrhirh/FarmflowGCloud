import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/I18nContext';

export default function ImportResult({ result, onReset }) {
  const { t } = useI18n();

  return (
    <section className="rounded-2xl border border-primary/25 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.8} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg tracking-tight">{t('imp.done', { n: result.created })}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('imp.doneHint')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.route && (
              <Button asChild size="sm" className="gap-1.5">
                <Link to={result.route}>
                  {t('imp.viewData')}
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              {t('imp.newImport')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}