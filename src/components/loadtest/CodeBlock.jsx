import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function CodeBlock({ code, label = 'Copier' }) {
  const { toast } = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Copié' });
    } catch {
      toast({ title: 'Copie impossible', description: 'Sélectionnez le texte manuellement.', variant: 'destructive' });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 bg-secondary/30">
      <Button
        variant="ghost"
        size="sm"
        onClick={copy}
        className="absolute end-2 top-2 z-10 h-7 gap-1.5 rounded-lg bg-card/90 px-2 text-[11px]"
      >
        <Copy className="h-3 w-3" strokeWidth={2} />
        {label}
      </Button>
      <pre className="overflow-x-auto p-4 pe-24 font-mono text-[11.5px] leading-relaxed text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}