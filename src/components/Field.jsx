import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function Field({ label, hint, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</Label>
      )}
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}