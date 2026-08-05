"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Ouvrier {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface Props {
  ouvriers: Ouvrier[];
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}

export function AffecterLibreForm({ ouvriers, action }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Record<string, string>>({});

  if (!ouvriers.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Aucun ouvrier libre : tous les ouvriers actifs sont déjà affectés à un département.
      </div>
    );
  }

  function handleAffecter(ouvrierId: string) {
    setError(null);
    setPendingId(ouvrierId);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("ouvrier_id", ouvrierId);
      fd.set("role", roles[ouvrierId] ?? "membre");
      const res = await action(fd);
      setPendingId(null);
      if (res?.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="p-4 space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {ouvriers.map((o) => (
        <Card key={o.id}>
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="font-medium text-sm">
                {o.prenom} {o.nom}
              </p>
              <p className="text-xs text-muted-foreground truncate">{o.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={roles[o.id] ?? "membre"}
                onChange={(e) =>
                  setRoles((prev) => ({ ...prev, [o.id]: e.target.value }))
                }
                disabled={isPending && pendingId === o.id}
                className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="membre">Membre</option>
                <option value="secretaire">Secrétaire</option>
                <option value="tresorier">Trésorier</option>
                <option value="vice_president">Vice-président</option>
                <option value="president">Président</option>
              </select>
              <Button
                size="sm"
                disabled={isPending && pendingId === o.id}
                onClick={() => handleAffecter(o.id)}
              >
                {isPending && pendingId === o.id ? "Affectation…" : "Affecter"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
