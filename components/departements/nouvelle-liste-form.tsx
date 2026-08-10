"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

interface Props {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}

export function NouvelleListeForm({ action }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [ouvert, setOuvert] = useState(false);

  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nom.trim()) return;
    const fd = new FormData();
    fd.set("nom", nom.trim());
    startTransition(async () => {
      setError(null);
      const res = await action(fd);
      if (res.error) setError(res.error);
      else {
        setNom("");
        setOuvert(false);
      }
    });
  }

  if (!ouvert) {
    return (
      <Button variant="outline" className="w-full gap-2" onClick={() => setOuvert(true)}>
        <Plus size={16} />
        Nouvelle liste
      </Button>
    );
  }

  return (
    <form onSubmit={soumettre} className="space-y-2">
      <Input
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        placeholder="Nom de la liste (ex. Risques, Projets…)"
        autoFocus
        disabled={isPending}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending || !nom.trim()} className="flex-1">
          {isPending ? "Création…" : "Créer"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOuvert(false)} disabled={isPending}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
