import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";
import { format } from "@/lib/format";

export interface RapportListe {
  id: string;
  periode: string;
  date_soumission: string;
  auteurNom: string;
  departementNom?: string;
}

export function ListeRapports({
  rapports,
  afficherDepartement = false,
}: {
  rapports: RapportListe[];
  afficherDepartement?: boolean;
}) {
  if (!rapports.length) {
    return <EmptyState icon={FileText} message="Aucun rapport soumis pour l'instant." />;
  }

  return (
    <div className="flex flex-col gap-8">
      {rapports.map((r) => (
        <Link key={r.id} href={`/rapports/${r.id}`}>
          <Card className="hover:border-primary/30 hover:bg-primary/5 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                {afficherDepartement && (
                  <p className="font-semibold text-sm truncate">{r.departementNom ?? "—"}</p>
                )}
                <p
                  className={
                    afficherDepartement
                      ? "text-xs text-muted-foreground mt-0.5 capitalize"
                      : "font-semibold text-sm capitalize"
                  }
                >
                  {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
                    new Date(r.periode)
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Soumis le {format.date(r.date_soumission)} par {r.auteurNom}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
