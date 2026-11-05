import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

function getInitials(name, email) {
  const source = (name || email || '').trim();
  if (!source) return '?';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
}

export default function UserBadge({ className, compact = false }) {
  const { user } = useAuth();
  if (!user) return null;

  const name = user.full_name || user.email || '';
  const initials = getInitials(user.full_name, user.email);

  return (
    <div
      title={user.email || name}
      className={cn(
        'inline-flex max-w-[11rem] items-center gap-1.5 rounded-xl border border-border/70 bg-card px-2.5 py-1.5',
        className,
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold uppercase tracking-wide text-primary">
        {initials}
      </span>
      {!compact && <span className="truncate text-[11px] font-medium">{name}</span>}
    </div>
  );
}