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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border print:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
