"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  assignerRole,
  suspendreOuvrier,
  reactiverOuvrier,
  marquerQuitte,
} from "@/app/(app)/departements/[id]/equipe/actions";

const ROLES = [
  { value: "president", label: "Président" },
  { value: "vice_president", label: "Vice-président" },
  { value: "secretaire", label: "Secrétaire" },
  { value: "tresorier", label: "Trésorier" },
  { value: "membre", label: "Membre" },
] as const;

interface Props {
  departementId: string;
  affectationId: string;
  statut: "actif" | "suspendu";
  roleActuel: string;
  isPilotage: boolean;
  isPresident: boolean;
}

export function EquipeActions({
  departementId,
  affectationId,
  statut,
  roleActuel,
  isPilotage,
  isPresident,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRoles, setShowRoles] = useState(false);

  const peutGerer = isPilotage || isPresident;

  if (!peutGerer) return null;

  function handle(fn: () => Promise<{ error?: string; success?: boolean }>, retourListe = false) {
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (res.error) {
        setError(res.error);
      } else if (retourListe) {
        router.push(`/departements/${departementId}/equipe`);
      } else {
        router.refresh();
      }
      setShowRoles(false);
    });
  }

  return (
    <div className="space-y-2">
      {statut === "actif" && (
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowRoles((v) => !v)}
            disabled={isPending}
          >
            Rôle : {ROLES.find((r) => r.value === roleActuel)?.label ?? roleActuel}
            <ChevronDown size={16} className="text-muted-foreground" />
          </Button>
          {showRoles && (
            <div className="absolute inset-x-0 top-full mt-1 z-10 bg-popover border border-border rounded-md shadow-md overflow-hidden">
              {ROLES.filter((r) => r.value !== "president" || isPilotage).map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                    r.value === roleActuel ? "font-semibold text-primary" : ""
                  }`}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("role", r.value);
                    handle(() => assignerRole(departementId, affectationId, fd));
                  }}
                  disabled={isPending || r.value === roleActuel}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {statut === "actif" && (
        <Button
          type="button"
          variant="outline"
          className="w-full text-orange-600 border-orange-600/30 hover:bg-orange-500/10 hover:text-orange-600"
          disabled={isPending}
          onClick={() => handle(() => suspendreOuvrier(departementId, affectationId))}
        >
          Suspendre
        </Button>
      )}

      {statut === "suspendu" && (
        <Button
          type="button"
          variant="outline"
          className="w-full text-green-600 border-green-600/30 hover:bg-green-500/10 hover:text-green-600"
          disabled={isPending}
          onClick={() => handle(() => reactiverOuvrier(departementId, affectationId))}
        >
          Réactiver
        </Button>
      )}

      {isPilotage && (
        <Button
          type="button"
          variant="outline"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          disabled={isPending}
          onClick={() => {
            if (!confirm("Marquer ce départ comme définitif ?")) return;
            handle(() => marquerQuitte(departementId, affectationId), true);
          }}
        >
          Marquer le départ définitif
        </Button>
      )}

      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
