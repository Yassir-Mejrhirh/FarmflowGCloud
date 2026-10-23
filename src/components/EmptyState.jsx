export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      {Icon && (
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="h-5 w-5" strokeWidth={1.6} />
        </span>
      )}
      <p className="font-display text-lg">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}