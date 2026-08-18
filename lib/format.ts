export const format = {
  date(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(dateStr));
  },

  // Mois complet ("août 2026") si la plage couvre exactement un mois
  // calendaire -- le cas le plus courant -- sinon la plage explicite
  // ("1 août – 15 sept. 2026").
  periode(debut: string, fin: string): string {
    const d1 = new Date(debut);
    const d2 = new Date(fin);
    const dernierJourMois = new Date(d1.getFullYear(), d1.getMonth() + 1, 0).getDate();
    const memeMois = d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    const estMoisComplet = d1.getDate() === 1 && d2.getDate() === dernierJourMois && memeMois;

    if (estMoisComplet) {
      return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d1);
    }

    const anneeDiffere = d1.getFullYear() !== d2.getFullYear();
    const debutLabel = new Intl.DateTimeFormat(
      "fr-FR",
      anneeDiffere ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" }
    ).format(d1);
    const finLabel = new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d2);
    return `${debutLabel} – ${finLabel}`;
  },

  montant(amount: number): string {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FC";
  },

  roleDepartement(role: string): string {
    const labels: Record<string, string> = {
      president: "Président",
      vice_president: "Vice-président",
      secretaire: "Secrétaire",
      tresorier: "Trésorier",
      membre: "Membre",
    };
    return labels[role] ?? role;
  },

  roleGlobal(role: string | null): string {
    if (!role) return "Ouvrier";
    return role === "pasteur" ? "Pasteur" : "Assistant pasteur";
  },

  statut(statut: string): string {
    const labels: Record<string, string> = {
      actif: "Actif",
      suspendu: "Suspendu",
      quitte: "Quitté",
      inactif: "Inactif",
    };
    return labels[statut] ?? statut;
  },
};
