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
    <header className="sticky top-0 z-40 bg-primary px-4 h-14 flex items-center justify-between shadow-[0_2px_12px_-4px_rgba(0,0,0,0.25)]">
      <div>
        {/* Doubleplus n'a qu'une seule graisse (400) -- pas de
            font-semibold, qui ne ferait que du faux-gras moche. */}
        <h1 className="font-display text-lg leading-tight text-primary-foreground">{title}</h1>
        {prenom && (
          <p className="text-xs text-primary-foreground/75">Bonjour, {prenom}</p>
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
