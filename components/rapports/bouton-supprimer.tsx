"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  action: () => Promise<{ error?: string; success?: boolean }>;
  redirectTo: string;
}

export function BoutonSupprimerRapport({ action, redirectTo }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function supprimer() {
    if (!confirm("Supprimer définitivement ce rapport ? Cette action est irréversible.")) return;
    startTransition(async () => {
      setError(null);
      const res = await action();
      if (res.error) setError(res.error);
      else router.push(redirectTo);
    });
  }

  return (
    <div className="print:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        disabled={isPending}
        onClick={supprimer}
      >
        <Trash2 size={14} />
        Supprimer
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
