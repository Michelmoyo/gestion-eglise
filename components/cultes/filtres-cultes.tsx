"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "@/lib/format";

interface Props {
  typesDisponibles: string[];
  debut: string;
  fin: string;
  type: string;
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

export function FiltresCultes({ typesDisponibles, debut, fin, type }: Props) {
  const router = useRouter();
  const [ouvertDebut, setOuvertDebut] = useState(false);
  const [ouvertFin, setOuvertFin] = useState(false);

  const actif = !!debut || !!fin || !!type;

  function appliquer(nouveauDebut: string, nouveauFin: string, nouveauType: string) {
    const params = new URLSearchParams();
    if (nouveauDebut) params.set("debut", nouveauDebut);
    if (nouveauFin) params.set("fin", nouveauFin);
    if (nouveauType) params.set("type", nouveauType);
    const qs = params.toString();
    router.push(qs ? `/cultes?${qs}` : "/cultes");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={ouvertDebut} onOpenChange={setOuvertDebut}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-9 gap-2 font-normal">
            <CalendarIcon size={14} className="text-muted-foreground shrink-0" />
            {debut ? format.date(debut) : "Depuis"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <Calendar
            mode="single"
            selected={versDate(debut)}
            defaultMonth={versDate(debut)}
            onSelect={(date) => {
              if (!date) return;
              const valeur = versChaine(date);
              setOuvertDebut(false);
              const finCorrigee = fin && fin < valeur ? valeur : fin;
              appliquer(valeur, finCorrigee, type);
            }}
          />
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground text-sm">→</span>

      <Popover open={ouvertFin} onOpenChange={setOuvertFin}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-9 gap-2 font-normal">
            <CalendarIcon size={14} className="text-muted-foreground shrink-0" />
            {fin ? format.date(fin) : "Jusqu'à"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          <Calendar
            mode="single"
            selected={versDate(fin)}
            defaultMonth={versDate(fin) ?? versDate(debut)}
            disabled={debut ? { before: versDate(debut)! } : undefined}
            onSelect={(date) => {
              if (!date) return;
              const valeur = versChaine(date);
              setOuvertFin(false);
              appliquer(debut, valeur, type);
            }}
          />
        </PopoverContent>
      </Popover>

      <select
        value={type}
        onChange={(e) => appliquer(debut, fin, e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">Tous les types</option>
        {typesDisponibles.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {actif && (
        <button
          type="button"
          onClick={() => router.push("/cultes")}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X size={13} />
          Réinitialiser
        </button>
      )}
    </div>
  );
}
