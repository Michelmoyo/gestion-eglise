"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";

type Ouvrier = { id: string; prenom: string; nom: string };

type Props = {
  action: (formData: FormData) => Promise<void>;
  ouvriers: Ouvrier[];
  presenceByOuvrier: Record<string, string>;
};

const STATUTS = [
  { value: "present", label: "P", title: "Présent", color: "bg-green-500 text-white" },
  { value: "absent", label: "A", title: "Absent", color: "bg-red-500 text-white" },
  { value: "excuse", label: "E", title: "Excusé", color: "bg-orange-400 text-white" },
] as const;

export function PresencesCulteForm({ action, ouvriers, presenceByOuvrier }: Props) {
  const [, formAction, pending] = useActionState(
    async (_: unknown, formData: FormData) => {
      await action(formData);
      return null;
    },
    null
  );

  // Etat controle (pas defaultChecked) pour pouvoir remplir "tout present"
  // en un clic -- sinon impossible de reflechir la selection group dans le DOM.
  const [statuts, setStatuts] = useState<Record<string, string>>(presenceByOuvrier);
  const [confirmTout, setConfirmTout] = useState(false);

  const nbDejaSaisis = Object.values(statuts).filter(Boolean).length;

  function marquerTout() {
    if (nbDejaSaisis > 0 && !confirmTout) {
      setConfirmTout(true);
      return;
    }
    setStatuts(Object.fromEntries(ouvriers.map((o) => [o.id, "present"])));
    setConfirmTout(false);
  }

  return (
    <form action={formAction} className="space-y-3">
      {confirmTout ? (
        <div className="flex items-center gap-2 bg-orange-100 rounded-lg p-2.5">
          <p className="flex-1 text-xs text-orange-700">
            Remplacer les {nbDejaSaisis} statuts déjà saisis par « Présent » ?
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmTout(false)}>
            Annuler
          </Button>
          <Button type="button" size="sm" onClick={marquerTout}>
            Confirmer
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full gap-2" onClick={marquerTout}>
          <CheckCheck size={16} />
          Tout marquer présent
        </Button>
      )}

      {ouvriers.map((o) => {
        const statut = statuts[o.id] ?? "";
        return (
          <div key={o.id} className="flex items-center justify-between gap-2">
            <span className="text-sm flex-1 min-w-0 truncate">
              {o.prenom} {o.nom}
            </span>
            <div className="flex gap-1.5 flex-shrink-0">
              {STATUTS.map((s) => (
                <label key={s.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name={`statut_${o.id}`}
                    value={s.value}
                    checked={statut === s.value}
                    onChange={() => setStatuts((prev) => ({ ...prev, [o.id]: s.value }))}
                    className="sr-only peer"
                  />
                  <span
                    title={s.title}
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold border-2 border-transparent peer-checked:border-foreground transition-all ${s.color} opacity-40 peer-checked:opacity-100`}
                  >
                    {s.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <Button type="submit" className="w-full mt-2" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer les présences"}
      </Button>
    </form>
  );
}
