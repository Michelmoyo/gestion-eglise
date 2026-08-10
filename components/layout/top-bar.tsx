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
    <header className="sticky top-0 z-40 bg-white border-b border-border px-4 h-14 flex items-center justify-between">
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
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
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
