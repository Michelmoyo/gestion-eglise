"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";

type Membre = { id: string; prenom: string; nom: string };

type Props = {
  action: (formData: FormData) => Promise<void>;
  membres: Membre[];
  presenceByOuvrier: Record<string, string>;
  readonly?: boolean;
};

const STATUTS = [
  { value: "present", label: "P", title: "Présent", color: "bg-green-500 text-white" },
  { value: "absent", label: "A", title: "Absent", color: "bg-red-500 text-white" },
  { value: "excuse", label: "E", title: "Excusé", color: "bg-orange-400 text-white" },
] as const;

export function PresencesForm({ action, membres, presenceByOuvrier, readonly }: Props) {
  const [, formAction, pending] = useActionState(
    async (_: unknown, formData: FormData) => {
      await action(formData);
      return null;
    },
    null
  );

  if (readonly) {
    return (
      <div className="space-y-2">
        {membres.map((m) => {
          const statut = presenceByOuvrier[m.id];
          const s = STATUTS.find((s) => s.value === statut);
          return (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <span>{m.prenom} {m.nom}</span>
              {s ? (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.color}`}>{s.title}</span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      {membres.map((m) => {
        const statut = presenceByOuvrier[m.id] ?? "";
        return (
          <div key={m.id} className="flex items-center justify-between gap-2">
            <span className="text-sm flex-1 min-w-0 truncate">
              {m.prenom} {m.nom}
            </span>
            <div className="flex gap-1 flex-shrink-0">
              {STATUTS.map((s) => (
                <label key={s.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name={`statut_${m.id}`}
                    value={s.value}
                    defaultChecked={statut === s.value}
                    className="sr-only peer"
                  />
                  <span
                    title={s.title}
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border-2 border-transparent peer-checked:border-foreground transition-all ${s.color} opacity-40 peer-checked:opacity-100`}
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
