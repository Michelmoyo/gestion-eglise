import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
}

export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon size={22} className="text-primary/70" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
