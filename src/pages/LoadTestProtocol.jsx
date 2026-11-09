import { AlertTriangle, Copy, Gauge, ShieldCheck, Timer } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ProtocolSection from '@/components/loadtest/ProtocolSection';
import DataTable from '@/components/loadtest/DataTable';
import ScenarioCard from '@/components/loadtest/ScenarioCard';
import IsolationChecklist from '@/components/loadtest/IsolationChecklist';
import CodeBlock from '@/components/loadtest/CodeBlock';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  cleanupSteps,
  consistencyChecks,
  dataset,
  indicators,
  isolationSteps,
  k6RunCommand,
  k6Script,
  limitations,
  manifestCommand,
  platformLimits,
  ramp,
  reportTemplate,
  roles,
  rules,
  scenarios,
  stopConditions,
  protocolMarkdown,
} from '@/lib/loadTestProtocol';

const targets = [
  { icon: Gauge, label: 'Charge visée', value: '6 utilisateurs', hint: '5 à 6 en écriture simultanée' },
  { icon: Timer, label: 'Rythme par utilisateur', value: '1 écriture / s', hint: 'Scénarios S1 à S4 combinés' },
  { icon: ShieldCheck, label: 'Critère de réussite', value: '0 erreur 5xx', hint: 'p95 création sous 1,2 s' },
];

export default function LoadTestProtocol() {
  const { toast } = useToast();

  const copyProtocol = async () => {
    try {
      await navigator.clipboard.writeText(protocolMarkdown());
      toast({ title: 'Protocole copié', description: 'Collez-le dans le document de votre choix.' });
    } catch {
      toast({ title: 'Copie impossible', description: 'Sélectionnez le texte manuellement.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Qualité & tests"
        title="Protocole de test de charge"
        description="Vérifier que FarmFlow reste stable quand cinq à six utilisateurs écrivent en même temps, sans jamais toucher aux données de production."
        action={
          <Button onClick={copyProtocol} variant="outline" className="rounded-xl">
            <Copy className="h-4 w-4" strokeWidth={1.8} />
            Copier le protocole
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        {targets.map((target) => (
          <div key={target.label} className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <target.icon className="h-4 w-4" strokeWidth={1.7} />
              <p className="text-[10px] uppercase tracking-[0.14em]">{target.label}</p>
            </div>
            <p className="mt-2 font-display text-lg leading-tight">{target.value}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{target.hint}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
          <div>
            <p className="text-sm font-medium">Sans isolation, ne pas commencer</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              La preview et l'application live partagent les mêmes données par défaut. Activez Test Data dans
              Settings (plan Builder ou supérieur), puis « Turn on test data » dans la preview, et prouvez la cible
              avant la première écriture.
            </p>
          </div>
        </div>
      </section>

      <ProtocolSection
        step="01"
        title="Règles non négociables"
        intro="Ces règles priment sur le calendrier du test : enfreindre l'une d'elles annule la campagne."
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {rules.map((rule) => (
            <li key={rule.title} className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
              <p className="text-sm font-medium leading-snug">{rule.title}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{rule.detail}</p>
            </li>
          ))}
        </ul>
      </ProtocolSection>

      <ProtocolSection step="02" title="Rôles et responsabilités">
        <DataTable
          columns={[
            { key: 'role', label: 'Rôle' },
            { key: 'duty', label: 'Responsabilité' },
          ]}
          rows={roles}
        />
      </ProtocolSection>

      <ProtocolSection
        step="03"
        title="Préparation de l'environnement isolé"
        intro="Chaque case cochée est une preuve, pas une formalité. La liste est conservée sur cet appareil."
      >
        <IsolationChecklist items={isolationSteps} />
        <p className="mt-3 rounded-xl bg-secondary/40 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
          Preuve à consigner : URL de la cible, date et heure, opérateur, nombre d'enregistrements de production
          avant et après l'écriture témoin. Un écart non nul signifie que le test doit être arrêté.
        </p>
      </ProtocolSection>

      <ProtocolSection
        step="04"
        title="Jeu de données de test"
        intro="Un jeu minimal suffit : ce qui compte est la forme des écritures, pas le volume."
      >
        <DataTable
          columns={[
            { key: 'item', label: 'Élément' },
            { key: 'quantity', label: 'Quantité', mono: true },
            { key: 'note', label: 'Remarque' },
          ]}
          rows={dataset}
        />
      </ProtocolSection>

      <ProtocolSection
        step="05"
        title="Scénarios"
        intro="Cinq scénarios, pondérés comme une journée réelle : beaucoup de rapports, du stock, quelques entretiens, des lectures en fond."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {scenarios.map((scenario) => (
            <ScenarioCard key={scenario.code} scenario={scenario} />
          ))}
        </div>
      </ProtocolSection>

      <ProtocolSection
        step="06"
        title="Montée en charge"
        intro="On monte par paliers, avec deux minutes de repos et un contrôle de comptage entre chaque. Un palier raté arrête la montée."
      >
        <DataTable
          columns={[
            { key: 'step', label: 'Palier' },
            { key: 'users', label: 'Utilisateurs', mono: true },
            { key: 'duration', label: 'Durée', mono: true },
            { key: 'purpose', label: 'Objectif' },
          ]}
          rows={ramp}
        />
      </ProtocolSection>

      <ProtocolSection
        step="07"
        title="Indicateurs et seuils"
        intro="Trois chiffres suffisent à décider : erreurs, latence, cohérence. Les seuils d'arrêt sont volontairement bas."
      >
        <DataTable
          columns={[
            { key: 'indicator', label: 'Indicateur' },
            { key: 'target', label: 'Cible' },
            { key: 'stop', label: "Seuil d'arrêt" },
          ]}
          rows={indicators}
        />

        <div className="mt-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Plafonds de débit de la plateforme
          </p>
          <DataTable
            columns={[
              { key: 'endpoint', label: 'Point d’accès' },
              { key: 'limit', label: 'Limite', mono: true },
            ]}
            rows={platformLimits}
            caption="Ces plafonds sont comptés par point d'accès, par application et par appelant : un 429 signale un débit trop élevé, pas une panne. On ralentit avant de conclure."
          />
        </div>
      </ProtocolSection>

      <ProtocolSection
        step="08"
        title="Arrêt d'urgence"
        intro="L'observateur arrête sans attendre l'accord du pilote. On ne relance pas avant analyse."
      >
        <ul className="space-y-2">
          {stopConditions.map((condition) => (
            <li
              key={condition}
              className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm leading-relaxed"
            >
              {condition}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          Procédure : arrêter la charge, noter l'heure et le palier, conserver les journaux et le manifeste, puis
          n'effectuer aucune écriture supplémentaire avant d'avoir compris la cause.
        </p>
      </ProtocolSection>

      <ProtocolSection
        step="09"
        title="Contrôle de cohérence après charge"
        intro="Un test sans contrôle de données ne prouve rien : il faut compter, comparer et réconcilier."
      >
        <ul className="space-y-1.5">
          {consistencyChecks.map((check) => (
            <li key={check} className="flex gap-2.5 text-sm leading-relaxed">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary/60" />
              <span>{check}</span>
            </li>
          ))}
        </ul>
      </ProtocolSection>

      <ProtocolSection
        step="10"
        title="Nettoyage"
        intro="Le nettoyage se fait sur le manifeste, jamais au filtre large."
      >
        <ol className="space-y-2">
          {cleanupSteps.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-relaxed">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-secondary text-[11px] tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </ProtocolSection>

      <ProtocolSection
        step="11"
        title="Compte rendu"
        intro="Un seul document, rempli pendant le test, pas reconstitué après coup."
      >
        <CodeBlock code={reportTemplate} label="Copier le modèle" />
      </ProtocolSection>

      <ProtocolSection step="12" title="Limites du test" intro="Ce que ce protocole ne prouve pas, à écrire noir sur blanc dans le compte rendu.">
        <ul className="space-y-1.5">
          {limitations.map((limit) => (
            <li key={limit} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
              <span>{limit}</span>
            </li>
          ))}
        </ul>
      </ProtocolSection>

      <ProtocolSection
        step="A"
        title="Annexe — scénario k6"
        intro="Script prêt à l'emploi. Aucun secret n'y figure : tout passe par des variables d'environnement, et il n'écrit que des rapports marqués LT-."
      >
        <CodeBlock code={k6Script} label="Copier le script" />

        <p className="mb-2 mt-4 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Exécution</p>
        <CodeBlock code={k6RunCommand} />

        <p className="mb-2 mt-4 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Manifeste de nettoyage
        </p>
        <CodeBlock code={manifestCommand} />

        <p className="mt-3 rounded-xl bg-secondary/40 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
          L'en-tête d'authentification et le jeton se copient depuis la page API de l'application. Si l'en-tête
          attendu diffère, adaptez la constante <span className="font-mono text-[11px]">headers</span> du script.
          N'écrivez jamais le jeton dans le fichier.
        </p>
      </ProtocolSection>
    </div>
  );
}