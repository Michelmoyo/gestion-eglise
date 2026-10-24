import type { LucideIcon } from "lucide-react";
import { IconChip } from "./icon-chip";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <IconChip icon={Icon} size={22} chipSize={48} className="text-primary/70" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
