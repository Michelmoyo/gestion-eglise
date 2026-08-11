"use client";

import { useState, useTransition } from "react";
import { Users, X } from "lucide-react";

export interface OuvrierSuivi {
  id: string;
  prenom: string;
  nom: string;
  email?: string;
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
  const [ouvert, setOuvert] = useState(false);

  function ajouter(ouvrierId: string) {
    startTransition(async () => {
      setError(null);
      const res = await ajouterAction(ouvrierId);
      if (res.error) setError(res.error);
      else setOuvert(false);
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
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {candidats.length > 0 && (
          <button
            type="button"
            onClick={() => setOuvert((o) => !o)}
            disabled={isPending}
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label="Ajouter une personne"
            title="Ajouter une personne"
          >
            <Users size={14} />
          </button>
        )}
      </div>

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

      {ouvert && (
        <div className="border border-border rounded-md divide-y divide-border overflow-hidden">
          {candidats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => ajouter(c.id)}
              disabled={isPending}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between gap-2"
            >
              <span className="truncate">{c.prenom} {c.nom}</span>
              {c.email && (
                <span className="text-xs text-muted-foreground flex-shrink-0">({c.email})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
