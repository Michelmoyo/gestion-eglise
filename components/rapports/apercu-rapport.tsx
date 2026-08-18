"use client";

import { useState, useTransition } from "react";
import { Eye, X, Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentRapport, type DocumentRapportProps } from "./document-rapport";

type DocumentProps = Omit<DocumentRapportProps, "statutLabel" | "dateAffichee">;

interface Props {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  periodeDebut: string;
  periodeFin: string;
  documentProps: DocumentProps;
}

export function ApercuRapport({ action, periodeDebut, periodeFin, documentProps }: Props) {
  const [apercuOuvert, setApercuOuvert] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function soumettre() {
    const fd = new FormData();
    fd.set("periode_debut", periodeDebut);
    fd.set("periode_fin", periodeFin);

    startTransition(async () => {
      setError(null);
      const res = await action(fd);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setApercuOuvert(false);
      }
    });
  }

  return (
    <>
      <Card>
        <CardContent className="pt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Les difficultés, besoins et objectifs affichés ci-dessus seront inclus tels quels
            dans le rapport. Pour les modifier, utilisez la page « Difficultés/Besoins/Objectifs »
            du département avant de soumettre.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && (
            <p className="text-sm text-green-600">Rapport soumis avec succès.</p>
          )}

          <Button type="button" className="w-full gap-2" onClick={() => setApercuOuvert(true)}>
            <Eye size={16} />
            Prévisualiser
          </Button>
        </CardContent>
      </Card>

      {apercuOuvert && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between gap-2 print:hidden">
            <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setApercuOuvert(false)} aria-label="Fermer l'aperçu">
              <X size={16} />
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
                <Download size={14} />
                Télécharger
              </Button>
              <Button type="button" size="sm" className="gap-1" disabled={isPending} onClick={soumettre}>
                <Send size={14} />
                {isPending ? "Soumission…" : "Soumettre"}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center px-4 py-2 print:hidden">{error}</p>
          )}

          <div className="py-6 px-4">
            <DocumentRapport {...documentProps} statutLabel="Aperçu" dateAffichee="—" />
          </div>
        </div>
      )}
    </>
  );
}
