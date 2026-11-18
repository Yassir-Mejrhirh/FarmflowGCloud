import { FlaskConical } from 'lucide-react';

export default function PrototypeNotice() {
  return (
    <div className="rounded-2xl border border-dashed border-clay/40 bg-clay/[0.07] p-3">
      <div className="flex items-start gap-2.5">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-clay" strokeWidth={1.9} />
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-clay">Prototype de démonstration</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-clay/80">
            Sites et ouvriers fictifs. Aucun accès aux données FarmFlow, aucune position réelle demandée,
            aucun pointage enregistré.
          </p>
        </div>
      </div>
    </div>
  );
}