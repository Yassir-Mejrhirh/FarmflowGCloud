export default function ScenarioCard({ scenario }) {
  return (
    <article className="rounded-xl border border-border/70 bg-secondary/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{scenario.code}</p>
          <h3 className="mt-1 font-display text-base leading-snug">{scenario.title}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] tabular-nums text-muted-foreground">
          {scenario.weight}
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{scenario.goal}</p>

      <ul className="mt-3 space-y-1.5">
        {scenario.actions.map((action) => (
          <li key={action} className="flex gap-2 text-sm leading-relaxed">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary/60" />
            <span>{action}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-border/60 pt-3 text-[12px] leading-relaxed">
        <span className="uppercase tracking-[0.12em] text-muted-foreground">Attendu · </span>
        {scenario.expected}
      </p>
    </article>
  );
}