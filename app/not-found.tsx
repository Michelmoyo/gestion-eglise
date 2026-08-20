import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative flex flex-col items-center text-center gap-5 max-w-sm">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Compass size={28} className="text-primary" />
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-semibold tracking-widest text-primary">404</p>
          <h1 className="text-xl font-semibold">Page introuvable</h1>
          <p className="text-sm text-muted-foreground">
            Cette page n&apos;existe pas ou a été déplacée. Vérifiez le lien, ou
            revenez à votre espace.
          </p>
        </div>

        <Button asChild className="w-full">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </div>
  );
}
