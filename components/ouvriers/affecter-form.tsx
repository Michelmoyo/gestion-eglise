"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface AffecterFormProps {
  ouvrierId: string;
  departements: { id: string; nom: string }[];
  action: (formData: FormData) => Promise<{ error?: string } | void>;
}

export function AffecterForm({ departements, action }: AffecterFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!departements.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Cet ouvrier est déjà affecté à tous les départements existants.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await action(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="space-y-1">
        <Label htmlFor="departement_id">Département</Label>
        <select
          id="departement_id"
          name="departement_id"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Choisir un département…</option>
          {departements.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="role">Rôle dans le département</Label>
        <select
          id="role"
          name="role"
          defaultValue="membre"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="membre">Membre</option>
          <option value="secretaire">Secrétaire</option>
          <option value="tresorier">Trésorier</option>
          <option value="vice_president">Vice-président</option>
          <option value="president">Président</option>
        </select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Affectation en cours…" : "Affecter"}
      </Button>
    </form>
  );
}
