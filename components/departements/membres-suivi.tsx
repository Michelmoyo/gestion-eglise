"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OuvrierSuivi {
  id: string;
  prenom: string;
  nom: string;
  email?: string;
}

interface Props {
  membres: OuvrierSuivi[];
  candidats: OuvrierSuivi[];
  ajouterAction: (ouvrierId: string) => Promise<{ error?: string; success?: boolean }>;
  retirerAction: (ouvrierId: string) => Promise<{ error?: string; success?: boolean }>;
}

// Icone seule ("people") : clic -> menu contextuel listant tout le monde
// (deja ajoute ou non), coche = a acces, clic sur un nom bascule
// ajout/retrait. Pas de texte visible tant qu'on n'a pas ouvert le menu.
export function MembresSuivi({ membres, candidats, ajouterAction, retirerAction }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    function surClicExterieur(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, [ouvert]);

  const tous = [...membres, ...candidats].sort((a, b) =>
    `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, "fr")
  );

  if (!tous.length) return null;

  function basculer(personne: OuvrierSuivi, estMembre: boolean) {
    startTransition(async () => {
      setError(null);
      const res = estMembre ? await retirerAction(personne.id) : await ajouterAction(personne.id);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="relative" ref={conteneurRef}>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        disabled={isPending}
        className={cn(
          "transition-colors",
          membres.length > 0 ? "text-primary" : "text-muted-foreground hover:text-primary"
        )}
        aria-label="Gérer les personnes ajoutées"
        title="Gérer les personnes ajoutées"
      >
        <Users size={16} />
      </button>

      {ouvert && (
        <div className="absolute z-20 right-0 top-full mt-1 w-64 bg-popover border border-border rounded-md shadow-md overflow-hidden">
          <div className="max-h-64 overflow-y-auto divide-y divide-border">
            {tous.map((p) => {
              const estMembre = membres.some((m) => m.id === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => basculer(p, estMembre)}
                  disabled={isPending}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between gap-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{p.prenom} {p.nom}</span>
                    {p.email && <span className="block text-xs text-muted-foreground truncate">{p.email}</span>}
                  </span>
                  {estMembre && <Check size={14} className="text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          {error && <p className="text-xs text-destructive px-3 py-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
