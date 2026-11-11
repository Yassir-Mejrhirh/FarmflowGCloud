export default function TrackingSection({ title, empty, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
      {empty ? <p className="text-xs text-muted-foreground">{empty}</p> : children}
    </section>
  );
}