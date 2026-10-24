import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IconChipProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
}

// Icone posee dans un badge rond colore, plutot qu'une icone nue -- motif
// recurrent du langage "doux" (puces d'icone colorees) adopte pour l'app.
export function IconChip({ icon: Icon, size = 20, className }: IconChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary/10 text-primary p-2.5",
        className
      )}
    >
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}
