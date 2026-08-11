"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { renvoyerInvitation } from "@/app/(app)/ouvriers/actions";

export function RenvoyerInvitationButton({ ouvrierId }: { ouvrierId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [envoyee, setEnvoyee] = useState(false);

  function handleClick() {
    startTransition(async () => {
      setError(null);
      const res = await renvoyerInvitation(ouvrierId);
      if (res.error) setError(res.error);
      else setEnvoyee(true);
    });
  }

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 w-full"
        disabled={isPending || envoyee}
        onClick={handleClick}
      >
        <Send size={14} />
        {isPending ? "Envoi…" : envoyee ? "Invitation renvoyée" : "Renvoyer l'invitation"}
      </Button>
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
