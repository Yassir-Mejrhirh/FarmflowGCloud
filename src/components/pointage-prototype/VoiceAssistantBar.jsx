import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Check, X, Keyboard, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isVoiceSupported, parseDarijaCommand, startDarijaRecognition } from '@/lib/darijaVoice';
import { VOICE_EXAMPLES } from '@/lib/pointagePrototypeData';
import { cn } from '@/lib/utils';

const ERROR_MESSAGES = {
  'not-allowed': 'Micro refusé. Autorisez le microphone ou utilisez les boutons.',
  'service-not-allowed': 'Micro indisponible sur cet appareil. Utilisez les boutons.',
  'no-speech': 'Aucune parole entendue. Réessayez ou utilisez les boutons.',
  'audio-capture': 'Aucun microphone détecté. Utilisez les boutons.',
  network: 'La reconnaissance vocale a besoin du réseau. Utilisez les boutons.',
};

function describeAction(action) {
  if (!action) return null;
  if (action.kind === 'unknown') {
    return { title: 'Commande non comprise', detail: 'Reformulez ou marquez l’ouvrier avec les boutons.', valid: false };
  }
  if (action.kind === 'search') {
    return {
      title: action.worker ? `Rechercher ${action.worker.name}` : 'Recherche sans nom reconnu',
      detail: action.worker ? 'La liste sera filtrée sur cet ouvrier.' : 'Aucun ouvrier reconnu dans la phrase.',
      valid: Boolean(action.worker),
    };
  }
  if (action.kind === 'add') {
    return { title: 'Ajouter un ouvrier (démo)', detail: 'Ouvre le formulaire d’ajout fictif.', valid: true };
  }
  if (!action.worker) {
    return { title: 'Ouvrier non reconnu', detail: 'Le nom prononcé ne correspond à aucun ouvrier de ce site.', valid: false };
  }
  return {
    title: `${action.worker.name} → ${action.kind === 'present' ? 'présent' : 'absent'}`,
    detail: 'Confirmez pour appliquer la marque sur la démonstration.',
    valid: true,
  };
}

export default function VoiceAssistantBar({ open, onClose, workers, onApply }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [action, setAction] = useState(null);
  const [error, setError] = useState('');
  const [typed, setTyped] = useState('');
  const recognitionRef = useRef(null);
  const supported = isVoiceSupported();

  useEffect(() => {
    if (!open) {
      recognitionRef.current?.stop?.();
      recognitionRef.current = null;
      setListening(false);
      setTranscript('');
      setAction(null);
      setError('');
      setTyped('');
    }
  }, [open]);

  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  const listen = () => {
    setError('');
    setAction(null);
    setTranscript('');
    const recognition = startDarijaRecognition({
      onResult: ({ finalText, interim }) => {
        setTranscript(`${finalText}${interim}`);
        if (finalText.trim()) setAction(parseDarijaCommand(finalText, workers));
      },
      onError: (code) => {
        setError(ERROR_MESSAGES[code] || 'La reconnaissance vocale s’est arrêtée. Utilisez les boutons.');
        setListening(false);
      },
      onEnd: () => setListening(false),
    });
    if (recognition) {
      recognitionRef.current = recognition;
      setListening(true);
    } else {
      setError('Reconnaissance vocale non prise en charge par ce navigateur. Les boutons restent disponibles.');
    }
  };

  const submitTyped = () => {
    if (!typed.trim()) return;
    setTranscript(typed);
    setAction(parseDarijaCommand(typed, workers));
  };

  const described = describeAction(action);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-foreground/30 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-card p-4 pb-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg leading-tight">Commande vocale (darija)</p>
            <p className="mt-1 text-[11.5px] text-muted-foreground">Facultatif : les boutons Présent / Absent restent utilisables.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={listen}
          disabled={!supported || listening}
          className={cn(
            'mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full border transition-all duration-300 disabled:opacity-50',
            listening ? 'animate-pulse border-clay bg-clay text-clay-foreground' : 'border-primary bg-primary text-primary-foreground',
          )}
        >
          {listening ? <MicOff className="h-7 w-7" strokeWidth={1.7} /> : <Mic className="h-7 w-7" strokeWidth={1.7} />}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {listening ? 'Écoute en cours… parlez en darija' : supported ? 'Touchez pour parler' : 'Micro non pris en charge sur ce navigateur'}
        </p>

        {transcript && (
          <div className="mt-3 rounded-2xl border border-border/80 bg-background p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Transcription</p>
            <p className="mt-1 text-[13px] leading-relaxed" dir="auto">{transcript}</p>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/[0.06] p-3">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" strokeWidth={2} />
            <p className="text-[11.5px] leading-relaxed text-destructive">{error}</p>
          </div>
        )}

        {described && (
          <div className="mt-3 rounded-2xl border border-border/80 p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Action reconnue</p>
            <p className="mt-1 text-[13px] font-medium leading-snug">{described.title}</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">{described.detail}</p>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              <Button
                size="sm"
                className="h-9 rounded-xl text-[12px]"
                disabled={!described.valid}
                onClick={() => {
                  onApply(action);
                  onClose();
                }}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                Confirmer
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-xl text-[12px]"
                onClick={() => {
                  setAction(null);
                  setTranscript('');
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <Keyboard className="h-3 w-3" strokeWidth={2} />
            Tester sans micro
          </p>
          <div className="mt-1.5 flex gap-1.5">
            <Input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && submitTyped()}
              placeholder="محمد حاضر"
              dir="auto"
              className="h-9 rounded-xl text-[12.5px]"
            />
            <Button size="sm" variant="secondary" className="h-9 rounded-xl text-[12px]" onClick={submitTyped}>
              Lire
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {VOICE_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                dir="auto"
                onClick={() => {
                  setTyped(example);
                  setTranscript(example);
                  setAction(parseDarijaCommand(example, workers));
                }}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}