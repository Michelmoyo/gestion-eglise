"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";

interface Props {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  periode: string;
  initialData: {
    difficultes: string;
    besoins: string;
    objectifs: string;
  };
}

const initial = { error: undefined as string | undefined, success: false };

function ChampListe({
  name,
  label,
  placeholder,
  valeurInitiale,
}: {
  name: string;
  label: string;
  placeholder: string;
  valeurInitiale: string;
}) {
  const [entrees, setEntrees] = useState<string[]>(() => {
    const lignes = valeurInitiale.split("\n").filter((l) => l.trim().length > 0);
    return lignes.length ? lignes : [""];
  });

  function ajouter() {
    setEntrees((e) => [...e, ""]);
  }

  function retirer(index: number) {
    setEntrees((e) => (e.length > 1 ? e.filter((_, i) => i !== index) : e));
  }

  function modifier(index: number, value: string) {
    setEntrees((e) => e.map((v, i) => (i === index ? value : v)));
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {entrees.map((valeur, i) => (
        <div key={i} className="flex gap-2 items-start">
          <Textarea
            name={name}
            value={valeur}
            onChange={(e) => modifier(i, e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="flex-1"
          />
          {entrees.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1 flex-shrink-0 h-8 w-8"
              onClick={() => retirer(i)}
              aria-label="Retirer cette entrée"
            >
              <X size={16} />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={ajouter}>
        <Plus size={14} />
        Ajouter
      </Button>
    </div>
  );
}

export function RapportForm({ action, periode, initialData }: Props) {
  const [state, formAction, isPending] = useActionState(
    async (_: typeof initial, fd: FormData) => {
      const res = await action(fd);
      return { error: res.error, success: !!res.success };
    },
    initial
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Compléter le rapport</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="periode" value={periode} />

          <ChampListe
            name="difficultes"
            label="Difficultés rencontrées"
            placeholder="Décrivez une difficulté…"
            valeurInitiale={initialData.difficultes}
          />

          <ChampListe
            name="besoins"
            label="Besoins"
            placeholder="Un besoin pour le mois prochain…"
            valeurInitiale={initialData.besoins}
          />

          <ChampListe
            name="objectifs"
            label="Objectifs du mois prochain"
            placeholder="Un objectif pour le mois à venir…"
            valeurInitiale={initialData.objectifs}
          />

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && (
            <p className="text-sm text-green-600">Rapport soumis avec succès.</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Soumission…" : "Soumettre le rapport"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
