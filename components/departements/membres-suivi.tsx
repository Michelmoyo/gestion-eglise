"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface OuvrierSuivi {
  id: string;
  prenom: string;
  nom: string;
}

interface Props {
  label: string;
  membres: OuvrierSuivi[];
  candidats: OuvrierSuivi[];
  ajouterAction: (ouvrierId: string) => Promise<{ error?: string; success?: boolean }>;
  retirerAction: (ouvrierId: string) => Promise<{ error?: string; success?: boolean }>;
}

// Reutilise pour ajouter des membres a une liste entiere ou a une seule
// tache -- ne fait qu'ajouter/retirer une ligne d'appartenance, la portee
// (liste vs tache) vient uniquement des actions passees en props.
export function MembresSuivi({ label, membres, candidats, ajouterAction, retirerAction }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [choix, setChoix] = useState("");

  function ajouter() {
    if (!choix) return;
    startTransition(async () => {
      setError(null);
      const res = await ajouterAction(choix);
      if (res.error) setError(res.error);
      else setChoix("");
    });
  }

  function retirer(ouvrierId: string) {
    startTransition(async () => {
      setError(null);
      const res = await retirerAction(ouvrierId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>

      {!membres.length ? (
        <p className="text-xs text-muted-foreground">Personne d&apos;ajouté.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {membres.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1 text-xs bg-secondary rounded-full pl-2 pr-1 py-1"
            >
              {m.prenom} {m.nom}
              <button
                type="button"
                onClick={() => retirer(m.id)}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Retirer ${m.prenom} ${m.nom}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {candidats.length > 0 && (
        <div className="flex gap-1.5">
          <select
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
            disabled={isPending}
            className="text-xs border border-input rounded-md px-2 py-1.5 flex-1 min-w-0 bg-background"
          >
            <option value="">Ajouter un ouvrier…</option>
            {candidats.map((c) => (
              <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
            ))}
          </select>
          <Button type="button" size="sm" variant="outline" onClick={ajouter} disabled={isPending || !choix}>
            Ajouter
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
