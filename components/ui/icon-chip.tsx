import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IconChipProps {
  icon: LucideIcon;
  size?: number;
  chipSize?: number;
  className?: string;
}

// Icone posee dans un badge rond colore, plutot qu'une icone nue -- motif
// recurrent du langage "doux" (puces d'icone colorees) deja present un peu
// partout dans l'app (en inline, duplique) : centralise ici pour que la
// taille/couleur reste coherente partout.
export function IconChip({ icon: Icon, size = 18, chipSize = 40, className }: IconChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0",
        className
      )}
      style={{ width: chipSize, height: chipSize }}
    >
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}
