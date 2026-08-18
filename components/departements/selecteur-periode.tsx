"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "@/lib/format";

interface Props {
  departementId: string;
  periodeDebut: string;
  periodeFin: string;
  aujourdHui: string;
}

// "YYYY-MM-DD" -> Date locale (évite le décalage d'un jour de `new Date(str)`,
// qui interprète la chaîne comme minuit UTC).
function versDate(valeur: string): Date | undefined {
  if (!valeur) return undefined;
  const [annee, mois, jour] = valeur.split("-").map(Number);
  return new Date(annee, mois - 1, jour);
}

function versChaine(date: Date): string {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

export function SelecteurPeriode({ departementId, periodeDebut, periodeFin, aujourdHui }: Props) {
  const router = useRouter();
  const [debut, setDebut] = useState(periodeDebut);
  const [fin, setFin] = useState(periodeFin);
  const [ouvertDebut, setOuvertDebut] = useState(false);
  const [ouvertFin, setOuvertFin] = useState(false);

  const invalide = !debut || !fin || fin < debut;
  const limiteHaute = versDate(aujourdHui);

  function appliquer(nouveauDebut: string, nouveauFin: string) {
    if (!nouveauDebut || !nouveauFin || nouveauFin < nouveauDebut) return;
    router.push(`/departements/${departementId}/rapport?debut=${nouveauDebut}&fin=${nouveauFin}`);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <Popover open={ouvertDebut} onOpenChange={setOuvertDebut}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2 font-normal justify-start"
            >
              <CalendarIcon size={14} className="text-muted-foreground shrink-0" />
              {debut ? format.date(debut) : "Début"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <Calendar
              mode="single"
              selected={versDate(debut)}
              defaultMonth={versDate(debut) ?? limiteHaute}
              disabled={limiteHaute ? { after: limiteHaute } : undefined}
              onSelect={(date) => {
                if (!date) return;
                const valeur = versChaine(date);
                setDebut(valeur);
                setOuvertDebut(false);
                // Si la fin devient antérieure au nouveau début, on l'aligne
                // dessus plutôt que de laisser une plage invalide en silence.
                const finCorrigee = fin && fin < valeur ? valeur : fin;
                if (finCorrigee !== fin) setFin(finCorrigee);
                if (finCorrigee) appliquer(valeur, finCorrigee);
              }}
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground text-sm">→</span>

        <Popover open={ouvertFin} onOpenChange={setOuvertFin}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2 font-normal justify-start"
            >
              <CalendarIcon size={14} className="text-muted-foreground shrink-0" />
              {fin ? format.date(fin) : "Fin"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end">
            <Calendar
              mode="single"
              selected={versDate(fin)}
              defaultMonth={versDate(fin) ?? versDate(debut) ?? limiteHaute}
              disabled={[
                ...(limiteHaute ? [{ after: limiteHaute }] : []),
                ...(debut ? [{ before: versDate(debut)! }] : []),
              ]}
              onSelect={(date) => {
                if (!date) return;
                const valeur = versChaine(date);
                setFin(valeur);
                setOuvertFin(false);
                if (debut) appliquer(debut, valeur);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      {invalide && debut && fin && (
        <p className="text-xs text-destructive">La date de fin doit suivre la date de début.</p>
      )}
    </div>
  );
}
