export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl leading-[1.1] tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}