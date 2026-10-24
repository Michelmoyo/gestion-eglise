// Catalogue des cultes hebdomadaires recurrents de l'eglise. Volontairement
// en dur (pas une table de config en base) : une seule eglise, ce rythme
// change rarement, et ça evite un ecran d'administration pour 4 lignes.
export type CulteRecurrentDef = {
  cle: string;
  label: string;
  jourSemaine: number; // 0 = dimanche, 1 = lundi, ... 6 = samedi (Date#getDay)
  heureDebut: string;
  heureFin: string;
};

export const CULTES_RECURRENTS: CulteRecurrentDef[] = [
  { cle: "mardi", label: "Culte du mardi", jourSemaine: 2, heureDebut: "17:30", heureFin: "19:30" },
  { cle: "jeudi", label: "Culte du jeudi", jourSemaine: 4, heureDebut: "17:30", heureFin: "19:30" },
  { cle: "dimanche-1", label: "1er culte dominical", jourSemaine: 0, heureDebut: "07:30", heureFin: "09:30" },
  { cle: "dimanche-2", label: "2e culte dominical", jourSemaine: 0, heureDebut: "10:30", heureFin: "12:30" },
];

export function trouverCulteRecurrent(cle: string): CulteRecurrentDef | undefined {
  return CULTES_RECURRENTS.find((c) => c.cle === cle);
}

// Prochaine date (AAAA-MM-JJ) a partir d'aujourd'hui inclus qui tombe sur le
// jour de la semaine demande.
export function prochaineOccurrence(jourSemaine: number, depuis: Date = new Date()): string {
  const d = new Date(depuis);
  d.setHours(0, 0, 0, 0);
  const diff = (jourSemaine - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}
