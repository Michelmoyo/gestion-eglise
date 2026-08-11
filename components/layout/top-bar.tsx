import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface TopBarProps {
  title: string;
  prenom?: string;
}

export async function TopBar({ title, prenom }: TopBarProps) {
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
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-sm border-b border-border/60 px-4 h-14 flex items-center justify-between">
      <div>
        <h1 className="font-semibold text-base leading-tight">{title}</h1>
        {prenom && (
          <p className="text-xs text-muted-foreground">Bonjour, {prenom}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Link href="/notifications">
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
            <Bell size={18} />
            {nbNonLues > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-4 text-center">
                {nbNonLues > 9 ? "9+" : nbNonLues}
              </span>
            )}
          </Button>
        </Link>
        <Link href="/mon-compte">
          <Button variant="ghost" size="icon" aria-label="Mon compte">
            <Settings size={18} />
          </Button>
        </Link>
        <form action={logout}>
          <Button variant="ghost" size="icon" type="submit" aria-label="Se déconnecter">
            <LogOut size={18} />
          </Button>
        </form>
      </div>
    </header>
  );
}
