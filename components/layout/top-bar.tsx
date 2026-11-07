import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title: string;
  prenom?: string;
  badge?: { label: string; dotClassName: string };
}

export async function TopBar({ title, prenom, badge }: TopBarProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let nbNonLues = 0;
  if (user) {
    const { data: moi } = await supabase
      .from("ouvriers")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (moi) {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("destinataire_id", moi.id)
        .eq("lue", false);
      nbNonLues = count ?? 0;
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-primary px-4 h-14 flex items-center justify-between shadow-[0_2px_12px_-4px_rgba(108,60,240,0.35)]">
      <div>
        {/* H1 du brief "Soft Cards" : 22/SemiBold. */}
        <h1 className="text-[22px] font-semibold leading-tight text-primary-foreground">{title}</h1>
        {prenom && (
          <p className="text-xs text-primary-foreground/75">Bonjour, {prenom}</p>
        )}
        {badge && (
          <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-white/18 px-2.5 py-0.5 w-fit">
            <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", badge.dotClassName)} />
            <span className="text-xs font-medium text-primary-foreground truncate max-w-[220px]">
              {badge.label}
            </span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Link href="/notifications">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
          >
            <Bell size={18} />
            {nbNonLues > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-gold text-[#221D16] text-[10px] font-bold leading-4 text-center">
                {nbNonLues > 9 ? "9+" : nbNonLues}
              </span>
            )}
          </Button>
        </Link>
        <Link href="/mon-compte">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mon compte"
            className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
          >
            <Settings size={18} />
          </Button>
        </Link>
        <form action={logout}>
          <Button
            variant="ghost"
            size="icon"
            type="submit"
            aria-label="Se déconnecter"
            className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
          >
            <LogOut size={18} />
          </Button>
        </form>
      </div>
    </header>
  );
}
