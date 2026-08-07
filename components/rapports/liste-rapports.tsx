import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        Aucun rapport soumis pour l&apos;instant.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rapports.map((r) => (
        <Link key={r.id} href={`/rapports/${r.id}`}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              {afficherDepartement && (
                <p className="font-semibold text-sm">{r.departementNom ?? "—"}</p>
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
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
