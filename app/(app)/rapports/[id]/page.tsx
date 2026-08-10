import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft } from "lucide-react";
import { format } from "@/lib/format";
import { getDonneesRapport } from "@/lib/rapport";
import { titillium } from "@/lib/fonts";
import { BoutonTelecharger } from "@/components/rapports/bouton-telecharger";
import styles from "./rapport-pdf.module.css";

const STATUT_LABEL: Record<string, string> = { present: "P", absent: "A", excuse: "E" };
const STATUT_STYLE: Record<string, string> = {
  present: styles.present,
  absent: styles.absent,
  excuse: styles.excused,
};

function listeDepuisTexte(texte: string | null): string[] {
  if (!texte) return [];
  return texte.split("\n").map((l) => l.trim()).filter(Boolean);
}

// Libelle plus descriptif pour les 3 listes par defaut ; les listes
// personnalisees s'affichent avec leur propre nom tel quel.
const LIBELLE_SUIVI: Record<string, string> = {
  "Difficultés": "Difficultés rencontrées",
  "Objectifs": "Objectifs — mois prochain",
};
function libelleSuivi(nom: string): string {
  return LIBELLE_SUIVI[nom] ?? nom;
}

function chunk<T>(items: T[], taille: number): T[][] {
  const groupes: T[][] = [];
  for (let i = 0; i < items.length; i += taille) groupes.push(items.slice(i, i + taille));
  return groupes;
}

function normaliserReference(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function dateCourte(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(new Date(dateStr));
}

function dateNumerique(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(dateStr)
  );
}

function SectionHead({ num, titre }: { num: string; titre: string }) {
  return (
    <div className={styles.sectionHead}>
      <span className={styles.sectionNum}>{num}</span>
      <h2>{titre}</h2>
      <span className={styles.rule}></span>
    </div>
  );
}

function Legende() {
  return (
    <div className={styles.legend}>
      <span className={styles.item}><span className={`${styles.xmark} ${styles.present}`}>P</span> Présent</span>
      <span className={styles.item}><span className={`${styles.xmark} ${styles.absent}`}>A</span> Absent</span>
      <span className={styles.item}><span className={`${styles.xmark} ${styles.excused}`}>E</span> Excusé</span>
      <span className={styles.item}><span className={`${styles.xmark} ${styles.none}`}>–</span> Non renseigné</span>
    </div>
  );
}

export default async function RapportDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: rapport } = await supabase
    .from("rapports")
    .select("id, departement_id, periode, difficultes, besoins, objectifs, suivi_snapshot, auteur_id, date_soumission")
    .eq("id", id)
    .single();

  if (!rapport || !rapport.departement_id) notFound();

  const { data: dept } = await supabase
    .from("departements")
    .select("nom")
    .eq("id", rapport.departement_id)
    .single();

  if (!dept) notFound();

  const { data: auteur } = await supabase
    .from("ouvriers")
    .select("prenom, nom, role_global")
    .eq("id", rapport.auteur_id)
    .single();

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  let peutVoirDetailCaisse = !!moi?.role_global;
  if (moi && !peutVoirDetailCaisse) {
    const { data: monAff } = await supabase
      .from("affectations")
      .select("role")
      .eq("ouvrier_id", moi.id)
      .eq("departement_id", rapport.departement_id)
      .eq("statut", "actif")
      .single();
    peutVoirDetailCaisse = ["president", "vice_president", "tresorier"].includes(monAff?.role ?? "");
  }

  // Fonction du rédacteur : son rôle global s'il est pilotage, sinon son
  // rôle actuel dans ce département.
  let fonctionAuteur = "—";
  if (auteur?.role_global) {
    fonctionAuteur = format.roleGlobal(auteur.role_global);
  } else {
    const { data: affAuteur } = await supabase
      .from("affectations")
      .select("role")
      .eq("ouvrier_id", rapport.auteur_id)
      .eq("departement_id", rapport.departement_id)
      .eq("statut", "actif")
      .single();
    fonctionAuteur = affAuteur ? format.roleDepartement(affAuteur.role) : "Ouvrier";
  }

  const { data: parametres } = await supabase
    .from("parametres_eglise")
    .select("nom_eglise, reseau, adresse, telephone, email")
    .limit(1)
    .single();

  const {
    roster,
    statsByActivite,
    presenceActiviteParOuvrier,
    nbActifs,
    nouveauxOuvriers,
    suspendusOuvriers,
    statsCultes,
    presenceCulteParOuvrier,
    soldeDebut,
    soldeFin,
    mouvementsPeriode,
  } = await getDonneesRapport(supabase, rapport.departement_id, rapport.periode, {
    peutVoirDetailCaisse,
  });

  const [anneeNum, moisNum] = rapport.periode.split("-").map(Number);
  const dernierJour = new Date(anneeNum, moisNum, 0).getDate();
  const moisLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    new Date(anneeNum, moisNum - 1, 1)
  );
  const reference = `RAP-${anneeNum}-${String(moisNum).padStart(2, "0")}-${normaliserReference(dept.nom)}`;

  // suivi_snapshot est le format courant (nombre de listes variable, cf.
  // listes_suivi.inclure_rapport). Les rapports soumis avant l'introduction
  // des listes personnalisees n'ont que les 3 colonnes figees historiques.
  const blocsSuivi: { nom: string; texte: string | null }[] =
    rapport.suivi_snapshot && rapport.suivi_snapshot.length
      ? rapport.suivi_snapshot
      : [
          { nom: "Difficultés", texte: rapport.difficultes },
          { nom: "Besoins", texte: rapport.besoins },
          { nom: "Objectifs", texte: rapport.objectifs },
        ];

  const nomEglise = parametres?.nom_eglise || "Église";
  const contactLigne2 = [parametres?.telephone, parametres?.email].filter(Boolean).join(" · ");

  return (
    // Le layout partage (app)/layout.tsx centre tout dans un conteneur
    // max-w-lg (~512px) pense pour les ecrans "app mobile" — beaucoup trop
    // etroit pour ce document (860px). On en sort volontairement ici.
    <div
      className="min-h-screen bg-gray-50 py-6 px-4"
      style={{ width: "100vw", marginLeft: "calc(50% - 50vw)" }}
    >
      <div className="max-w-[860px] mx-auto flex items-center justify-between mb-4 print:hidden">
        <Link
          href="/rapports"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Rapports
        </Link>
        <BoutonTelecharger />
      </div>

      <div className={`${styles.document} ${titillium.variable}`}>
        <article className={styles.page}>
          <header className={styles.letterhead}>
            <div className={styles.letterheadOrg}>
              {parametres?.reseau && <div className={styles.network}>{parametres.reseau}</div>}
              <div className={styles.church}>{nomEglise}</div>
            </div>
            {(parametres?.adresse || contactLigne2) && (
              <div className={styles.letterheadContact}>
                {parametres?.adresse}
                {parametres?.adresse && contactLigne2 && <br />}
                {contactLigne2}
              </div>
            )}
          </header>
          <div className={styles.brandRule}>
            <span className={styles.r1}></span>
            <span className={styles.r2}></span>
            <span className={styles.r3}></span>
          </div>

          <div className={styles.titleblock}>
            <h1>Rapport d&apos;activités du département</h1>
            <div className={styles.sub}>
              Département <strong>{dept.nom}</strong> — période de <strong>{moisLabel}</strong>
            </div>

            <div className={styles.idgrid}>
              <div className={styles.idcell}>
                <p className={styles.k}>Référence</p>
                <p className={styles.v}>{reference}</p>
              </div>
              <div className={styles.idcell}>
                <p className={styles.k}>Période couverte</p>
                <p className={styles.v}>01 – {dernierJour} {moisLabel}</p>
              </div>
              <div className={styles.idcell}>
                <p className={styles.k}>Statut</p>
                <p className={styles.v}><span className={styles.statusChip}>Soumis</span></p>
              </div>
              <div className={styles.idcell}>
                <p className={styles.k}>Rédigé par</p>
                <p className={styles.v}>{auteur ? `${auteur.prenom} ${auteur.nom}` : "—"}</p>
              </div>
              <div className={styles.idcell}>
                <p className={styles.k}>Fonction</p>
                <p className={styles.v}>{fonctionAuteur}</p>
              </div>
              <div className={styles.idcell}>
                <p className={styles.k}>Date de soumission</p>
                <p className={styles.v}>{format.date(rapport.date_soumission)}</p>
              </div>
            </div>
          </div>

          <section className={styles.section}>
            <SectionHead num="I." titre="État des ouvriers" />

            <div className={styles.statRow}>
              <div className={styles.stat}><span className={styles.n}>{nbActifs}</span><span className={styles.l}>Actifs</span></div>
              <div className={styles.stat}><span className={styles.n}>{nouveauxOuvriers.length}</span><span className={styles.l}>Adhérents ce mois</span></div>
              <div className={styles.stat}><span className={styles.n}>{suspendusOuvriers.length}</span><span className={styles.l}>Suspendus</span></div>
            </div>

            <p className={styles.subhead}>Effectif actif</p>
            {!roster.length ? (
              <p className={styles.empty}>Aucun membre actif.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.roster}>
                  <thead>
                    <tr>
                      <th className={styles.numhead}>№</th>
                      <th>Nom</th>
                      <th>Rôle</th>
                      <th>Membre depuis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((r, i) => (
                      <tr key={r.id}>
                        <td className={styles.numcell}>{i + 1}</td>
                        <td>
                          {r.prenom} {r.nom}
                          {r.estNouveau && <span className={styles.newChip}>Nouveau</span>}
                        </td>
                        <td>{format.roleDepartement(r.role)}</td>
                        <td className={styles.date}>{r.depuis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className={styles.subhead}>Ouvriers suspendus</p>
            {!suspendusOuvriers.length ? (
              <p className={styles.empty}>Aucun.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.roster}>
                  <thead>
                    <tr>
                      <th className={styles.numhead}>№</th>
                      <th>Nom</th>
                      <th>Rôle</th>
                      <th>Suspendu depuis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suspendusOuvriers.map((o, i) => (
                      <tr key={o.id}>
                        <td className={styles.numcell}>{i + 1}</td>
                        <td>{o.prenom} {o.nom}</td>
                        <td>{format.roleDepartement(o.role)}</td>
                        <td className={`${styles.date} ${styles.suspNote}`}>
                          {o.date_changement_statut ? dateNumerique(o.date_changement_statut) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.section}>
            <SectionHead num="II." titre="Activités du département" />
            {!statsByActivite.length ? (
              <p className={styles.empty}>Aucune activité ce mois.</p>
            ) : (
              <>
                <Legende />
                {chunk(statsByActivite, 4).map((groupe, gi) => (
                  <div key={gi}>
                    {gi > 0 && <p className={styles.matrixCont}>Activités du département (suite)</p>}
                    <div className={styles.matrixWrap}>
                      <table className={styles.matrix}>
                        <thead>
                          <tr>
                            <th className={styles.numhead}>№</th>
                            <th className={styles.rowhead}>Ouvrier</th>
                            {groupe.map((a) => (
                              <th key={a.id}>
                                <span className={styles.evtTitle} title={a.titre}>{a.titre}</span>
                                <span className={styles.evtDate}>{dateCourte(a.date_activite)}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {roster.map((r, ri) => (
                            <tr key={r.id}>
                              <td className={styles.numcell}>{ri + 1}</td>
                              <td className={styles.rowhead}>{r.prenom} {r.nom}</td>
                              {groupe.map((a) => {
                                const statut = presenceActiviteParOuvrier[r.id]?.[a.id];
                                return (
                                  <td key={a.id}>
                                    <span className={`${styles.xmark} ${statut ? STATUT_STYLE[statut] : styles.none}`}>
                                      {statut ? STATUT_LABEL[statut] : "–"}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td className={styles.numcell}></td>
                            <td className={styles.rowhead}>Présents</td>
                            {groupe.map((a) => (
                              <td key={a.id}>{a.nbTotal > 0 ? `${a.nbPresent}/${a.nbTotal}` : "—"}</td>
                            ))}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>

          <section className={styles.section}>
            <SectionHead num="III." titre="Présence au culte" />
            {!statsCultes.length ? (
              <p className={styles.empty}>Aucun culte ce mois.</p>
            ) : (
              <>
                <Legende />
                {chunk(statsCultes, 4).map((groupe, gi) => (
                  <div key={gi}>
                    {gi > 0 && <p className={styles.matrixCont}>Présence au culte (suite)</p>}
                    <div className={styles.matrixWrap}>
                      <table className={styles.matrix}>
                        <thead>
                          <tr>
                            <th className={styles.numhead}>№</th>
                            <th className={styles.rowhead}>Ouvrier</th>
                            {groupe.map((c) => (
                              <th key={c.id}>
                                <span className={styles.evtTitle} title={c.type}>{c.type}</span>
                                <span className={styles.evtDate}>{dateCourte(c.date_culte)}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {roster.map((r, ri) => (
                            <tr key={r.id}>
                              <td className={styles.numcell}>{ri + 1}</td>
                              <td className={styles.rowhead}>{r.prenom} {r.nom}</td>
                              {groupe.map((c) => {
                                const statut = presenceCulteParOuvrier[r.id]?.[c.id];
                                return (
                                  <td key={c.id}>
                                    <span className={`${styles.xmark} ${statut ? STATUT_STYLE[statut] : styles.none}`}>
                                      {statut ? STATUT_LABEL[statut] : "–"}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td className={styles.numcell}></td>
                            <td className={styles.rowhead}>Présents</td>
                            {groupe.map((c) => (
                              <td key={c.id}>{c.nbTotal > 0 ? `${c.nbPresent}/${c.nbTotal}` : "—"}</td>
                            ))}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>

          <section className={styles.section}>
            <SectionHead num="IV." titre="Caisse du département" />
            <div className={styles.balanceRow}>
              <span>Solde en début de période</span>
              <span className={styles.amt}>{format.montant(soldeDebut)}</span>
            </div>
            <div className={`${styles.balanceRow} ${styles.total}`}>
              <span>Solde en fin de période</span>
              <span className={styles.amt}>{format.montant(soldeFin)}</span>
            </div>

            {peutVoirDetailCaisse ? (
              <>
                <p className={styles.subhead} style={{ marginTop: 16 }}>Mouvements de la période</p>
                {!mouvementsPeriode.length ? (
                  <p className={styles.empty}>Aucun mouvement ce mois.</p>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.formal}>
                      <thead>
                        <tr>
                          <th>Motif</th>
                          <th>Date</th>
                          <th className={styles.num}>Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mouvementsPeriode.map((m) => (
                          <tr key={m.id}>
                            <td>{m.motif || (m.type === "entree" ? "Entrée" : "Sortie")}</td>
                            <td>{format.date(m.date_mouvement)}</td>
                            <td className={styles.num}>
                              <span className={`${styles.amt} ${m.type === "entree" ? styles.pos : styles.neg}`}>
                                {m.type === "entree" ? "+" : "−"}{format.montant(m.montant)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <p className={styles.empty} style={{ marginTop: 16 }}>
                Détail des mouvements réservé au président, vice-président ou trésorier.
              </p>
            )}
          </section>

          <section className={styles.section}>
            <SectionHead num="V." titre="Suivi du département" />
            {!blocsSuivi.length ? (
              <p className={styles.empty}>Aucune liste de suivi incluse dans ce rapport.</p>
            ) : (
              blocsSuivi.map((bloc, i) => {
                const lignes = listeDepuisTexte(bloc.texte);
                return (
                  <div key={i} className={styles.qualBlock}>
                    <h3>{libelleSuivi(bloc.nom)}</h3>
                    {lignes.length ? (
                      <ul>{lignes.map((l, j) => <li key={j}>{l}</li>)}</ul>
                    ) : (
                      <p className={styles.empty}>Aucun.</p>
                    )}
                  </div>
                );
              })
            )}
          </section>

          <footer className={styles.footer}>
            <div className={styles.sigrow}>
              <div className={styles.sigline}>Signature du président de département</div>
              <div className={styles.sigline}>Visa du pasteur / assistant</div>
            </div>
            <div className={styles.footerMeta}>
              <span>Document généré le {format.date(new Date().toISOString())} — {nomEglise}, Gestion des Départements</span>
              <span>Page 1 / 1</span>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
