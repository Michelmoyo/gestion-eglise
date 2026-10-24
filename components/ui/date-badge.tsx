import { cn } from "@/lib/utils";

interface DateBadgeProps {
  dateStr: string;
  className?: string;
}

// Petite tuile calendrier (jour + mois abrege) utilisee comme repere visuel
// devant une ligne de liste (culte, activite...), plutot qu'une simple
// icone generique.
export function DateBadge({ dateStr, className }: DateBadgeProps) {
  const [annee, mois, jour] = dateStr.split("-").map(Number);
  const date = new Date(annee, mois - 1, jour);
  const moisLabel = new Intl.DateTimeFormat("fr-FR", { month: "short" })
    .format(date)
    .replace(".", "");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-11 h-11 rounded-lg bg-primary/10 text-primary flex-shrink-0",
        className
      )}
    >
      <span className="text-sm font-bold leading-none">{jour}</span>
      <span className="text-[10px] uppercase leading-none mt-1">{moisLabel}</span>
    </div>
  );
}
