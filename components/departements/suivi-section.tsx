"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check, RotateCcw } from "lucide-react";
import { format } from "@/lib/format";

export interface PointSuivi {
  id: string;
  contenu: string;
  resolu: boolean;
  date_creation: string;
  date_resolution: string | null;
}

interface Props {
  titre: string;
  placeholder: string;
  items: PointSuivi[];
  peutGerer: boolean;
  ajouterAction: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  resoudreAction: (pointId: string) => Promise<{ error?: string; success?: boolean }>;
  rouvrirAction: (pointId: string) => Promise<{ error?: string; success?: boolean }>;
}

export function SuiviSection({
  titre,
  placeholder,
  items,
  peutGerer,
  ajouterAction,
  resoudreAction,
  rouvrirAction,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nouveauTexte, setNouveauTexte] = useState("");

  const ouverts = items.filter((i) => !i.resolu);
  const resolus = items.filter((i) => i.resolu);

  function ajouter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nouveauTexte.trim()) return;
    const fd = new FormData();
    fd.set("contenu", nouveauTexte.trim());
    startTransition(async () => {
      setError(null);
      const res = await ajouterAction(fd);
      if (res.error) setError(res.error);
      else setNouveauTexte("");
    });
  }

  function toggle(id: string, resolu: boolean) {
    startTransition(async () => {
      setError(null);
      const res = resolu ? await rouvrirAction(id) : await resoudreAction(id);
      if (res.error) setError(res.error);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          {titre} {ouverts.length > 0 && <span className="text-muted-foreground font-normal">({ouverts.length} ouvert{ouverts.length > 1 ? "s" : ""})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!items.length ? (
          <p className="text-sm text-muted-foreground">Aucun élément.</p>
        ) : (
          <div className="space-y-2">
            {ouverts.map((item) => (
              <div key={item.id} className="flex items-start gap-2">
                {peutGerer ? (
                  <button
                    type="button"
                    onClick={() => toggle(item.id, false)}
                    disabled={isPending}
                    className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border border-input hover:border-primary hover:bg-accent transition-colors"
                    aria-label="Marquer résolu"
                  />
                ) : (
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border border-input" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{item.contenu}</p>
                  <p className="text-xs text-muted-foreground">Émis le {format.date(item.date_creation)}</p>
                </div>
              </div>
            ))}

            {resolus.length > 0 && (
              <details className="pt-1">
                <summary className="text-xs text-muted-foreground cursor-pointer select-none">
                  Résolus ({resolus.length})
                </summary>
                <div className="space-y-2 mt-2">
                  {resolus.map((item) => (
                    <div key={item.id} className="flex items-start gap-2">
                      {peutGerer ? (
                        <button
                          type="button"
                          onClick={() => toggle(item.id, true)}
                          disabled={isPending}
                          className="mt-0.5 h-5 w-5 flex-shrink-0 rounded bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                          aria-label="Rouvrir"
                          title="Rouvrir"
                        >
                          <Check size={13} />
                        </button>
                      ) : (
                        <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded bg-green-500 text-white flex items-center justify-center">
                          <Check size={13} />
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground line-through">{item.contenu}</p>
                        <p className="text-xs text-muted-foreground">
                          Émis le {format.date(item.date_creation)}
                          {item.date_resolution ? ` · résolu le ${format.date(item.date_resolution)}` : ""}
                        </p>
                      </div>
                      {peutGerer && (
                        <button
                          type="button"
                          onClick={() => toggle(item.id, true)}
                          disabled={isPending}
                          className="text-xs text-muted-foreground hover:text-foreground flex-shrink-0 inline-flex items-center gap-1"
                          title="Rouvrir"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        {peutGerer && (
          <form onSubmit={ajouter} className="flex gap-2 pt-1">
            <Input
              value={nouveauTexte}
              onChange={(e) => setNouveauTexte(e.target.value)}
              placeholder={placeholder}
              disabled={isPending}
              className="text-sm"
            />
            <Button type="submit" size="icon" disabled={isPending || !nouveauTexte.trim()} aria-label="Ajouter">
              <Plus size={16} />
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
