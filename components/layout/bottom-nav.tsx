"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Building2, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleGlobalEnum } from "@/lib/supabase/types";

interface BottomNavProps {
  roleGlobal: RoleGlobalEnum | null;
  departementIds: string[];
}

export function BottomNav({ roleGlobal, departementIds }: BottomNavProps) {
  const pathname = usePathname();

  const isPilotage = roleGlobal === "pasteur" || roleGlobal === "assistant";
  const hasDepartements = departementIds.length > 0;

  const links = [
    {
      href: "/mon-espace",
      label: "Accueil",
      icon: Home,
      show: !isPilotage,
    },
    {
      href: departementIds.length === 1
        ? `/departements/${departementIds[0]}`
        : "/departements",
      label: "Département",
      icon: Building2,
      show: hasDepartements || isPilotage,
    },
    {
      href: "/ouvriers",
      label: "Ouvriers",
      icon: Users,
      show: isPilotage,
    },
    {
      href: "/pilotage",
      label: "Pilotage",
      icon: LayoutDashboard,
      show: isPilotage,
    },
  ].filter((l) => l.show);

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 print:hidden">
      <div
        className="flex items-center justify-around gap-1 h-16 max-w-lg mx-auto px-2 rounded-[1.75rem] border border-border/60 bg-card shadow-[0_1px_2px_rgba(20,10,15,0.04),0_12px_28px_-10px_rgba(20,10,15,0.18)]"
      >
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-full text-xs font-medium transition-all duration-150",
                active
                  ? "text-primary-foreground bg-primary shadow-[0_3px_0_0_rgba(0,0,0,0.2)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
