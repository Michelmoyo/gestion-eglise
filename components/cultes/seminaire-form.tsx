"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "@/lib/format";
import { genererCultesSeminaire } from "@/app/(app)/cultes/actions";

const MAX_JOURS = 120;

// Arithmetique de dates en UTC pur (jamais de local<->UTC implicite) pour
// rester correct quel que soit le fuseau du navigateur -- ce composant
// tourne cote client, pas forcement en UTC comme le serveur.
function listerDates(debut: string, fin: string): string[] {
  if (!debut || !fin || fin < debut) return [];
  const [y1, m1, d1] = debut.split("-").map(Number);
  const [y2, m2, d2] = fin.split("-").map(Number);
  const start = Date.UTC(y1, m1 - 1, d1);
  const end = Date.UTC(y2, m2 - 1, d2);
  if ((end - start) / 86_400_000 + 1 > MAX_JOURS) return [];

  const dates: string[] = [];
  for (let t = start; t <= end; t += 86_400_000) {
    const dt = new Date(t);
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

export function SeminaireForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [lieu, setLieu] = useState("");
  const [description, setDescription] = useState("");
  const [exclues, setExclues] = useState<Set<string>>(new Set());

  const toutesLesDates = useMemo(() => listerDates(dateDebut, dateFin), [dateDebut, dateFin]);
  const plageTropLongue = !!dateDebut && !!dateFin && dateFin >= dateDebut && toutesLesDates.length === 0;
  const datesRetenues = toutesLesDates.filter((d) => !exclues.has(d));

  function toggleDate(d: string) {
    setExclues((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  function valider() {
    setError(null);
    if (nom.trim().length < 2) return setError("Le nom du séminaire doit contenir au moins 2 caractères.");
    if (!datesRetenues.length) return setError("Aucune date sélectionnée.");

    startTransition(async () => {
      const res = await genererCultesSeminaire(
        nom,
        datesRetenues,
        heureDebut || null,
        heureFin || null,
        lieu || null,
        description || null
      );
      if (res?.error) setError(res.error);
      else router.push("/cultes");
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nom">Nom du séminaire *</Label>
        <Input
          id="nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Séminaire de formation des leaders…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="date_debut">Date de début *</Label>
          <Input
            id="date_debut"
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_fin">Date de fin *</Label>
          <Input
            id="date_fin"
            type="date"
            value={dateFin}
            min={dateDebut || undefined}
            onChange={(e) => setDateFin(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="heure_debut">Heure de début</Label>
          <Input
            id="heure_debut"
            type="time"
            value={heureDebut}
            onChange={(e) => setHeureDebut(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="heure_fin">Heure de fin</Label>
          <Input
            id="heure_fin"
            type="time"
            value={heureFin}
            onChange={(e) => setHeureFin(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lieu">Lieu</Label>
        <Input id="lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Temple principal…" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Détails…"
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
        />
      </div>

      {plageTropLongue && (
        <p className="text-sm text-destructive">
          La plage dépasse {MAX_JOURS} jours — réduis l&apos;intervalle.
        </p>
      )}

      {toutesLesDates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>
              Dates générées ({datesRetenues.length} / {toutesLesDates.length})
            </Label>
            <button
              type="button"
              className="text-xs text-primary"
              onClick={() => setExclues(exclues.size ? new Set() : new Set(toutesLesDates))}
            >
              {exclues.size ? "Tout cocher" : "Tout décocher"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Décoche les dates à exclure (jour férié, interruption du séminaire…).
          </p>
          <div className="max-h-64 overflow-y-auto rounded-md border border-input divide-y divide-border">
            {toutesLesDates.map((d) => (
              <label
                key={d}
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={!exclues.has(d)}
                  onChange={() => toggleDate(d)}
                  className="h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer"
                />
                {format.date(d)}
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="button" className="w-full" disabled={isPending} onClick={valider}>
        {isPending
          ? "Création…"
          : datesRetenues.length
          ? `Créer ${datesRetenues.length} culte${datesRetenues.length > 1 ? "s" : ""}`
          : "Créer les cultes"}
      </Button>
    </div>
  );
}
