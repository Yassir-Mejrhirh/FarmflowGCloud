export default function ProtocolSection({ step, title, intro, children }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-semibold tabular-nums text-primary">
          {step}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg leading-snug tracking-tight sm:text-xl">{title}</h2>
          {intro && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{intro}</p>}
        </div>
      </div>
      <div className="mt-4 sm:ps-10">{children}</div>
    </section>
  );
}