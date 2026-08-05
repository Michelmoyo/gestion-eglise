"use client";

import { useState, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRoles, setShowRoles] = useState(false);

  const peutGerer = isPilotage || isPresident;

  if (!peutGerer) return null;

  function handle(fn: () => Promise<{ error?: string; success?: boolean }>) {
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
      setShowRoles(false);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {/* Changer de rôle */}
      {statut === "actif" && (
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2"
            onClick={() => setShowRoles((v) => !v)}
            disabled={isPending}
          >
            Rôle ▾
          </Button>
          {showRoles && (
            <div className="absolute right-0 top-8 z-10 bg-popover border border-border rounded-md shadow-md min-w-[140px]">
              {ROLES.filter((r) => {
                if (r.value === "president" && !isPilotage) return false;
                return true;
              }).map((r) => (
                <button
                  key={r.value}
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

      {/* Suspendre */}
      {statut === "actif" && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2 text-orange-600 hover:text-orange-700"
          disabled={isPending}
          onClick={() => handle(() => suspendreOuvrier(departementId, affectationId))}
        >
          Suspendre
        </Button>
      )}

      {/* Réactiver */}
      {statut === "suspendu" && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2 text-green-600 hover:text-green-700"
          disabled={isPending}
          onClick={() => handle(() => reactiverOuvrier(departementId, affectationId))}
        >
          Réactiver
        </Button>
      )}

      {/* Marquer départ définitif — pasteur/assistant uniquement */}
      {isPilotage && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2 text-destructive hover:text-destructive"
          disabled={isPending}
          onClick={() => {
            if (!confirm("Marquer ce départ comme définitif ?")) return;
            handle(() => marquerQuitte(departementId, affectationId));
          }}
        >
          Départ définitif
        </Button>
      )}

      {error && <p className="text-xs text-destructive text-right">{error}</p>}
    </div>
  );
}
