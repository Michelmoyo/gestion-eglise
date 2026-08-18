import { format } from "@/lib/format";
import { titillium } from "@/lib/fonts";
import styles from "./rapport-pdf.module.css";

const STATUT_LABEL: Record<string, string> = { present: "P", absent: "A", excuse: "E" };
const STATUT_STYLE: Record<string, string> = {
  present: styles.present,
  absent: styles.absent,
  excuse: styles.excused,
};

const LIBELLE_SUIVI: Record<string, string> = {
  "Difficultés": "Difficultés rencontrées",
  "Objectifs": "Objectifs — mois prochain",
};

function listeDepuisTexte(texte: string | null): string[] {
  if (!texte) return [];
  return texte.split("\n").map((l) => l.trim()).filter(Boolean);
}

function libelleSuivi(nom: string): string {
  return LIBELLE_SUIVI[nom] ?? nom;
}

function chunk<T>(items: T[], taille: number): T[][] {
  const groupes: T[][] = [];
  for (let i = 0; i < items.length; i += taille) groupes.push(items.slice(i, i + taille));
  return groupes;
}

const DIACRITIQUES = new RegExp("[\\u0300-\\u036f]", "g");

export function normaliserReference(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(DIACRITIQUES, "")
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

export interface DocumentRapportProps {
  nomEglise: string;
  reseau: string | null;
  adresse: string | null;
  contactLigne2: string;
  logoUrl: string | null;
  deptNom: string;
  periodeLabel: string;
  periodeDebut: string;
  periodeFin: string;
  reference: string;
  statutLabel: string;
  auteurNom: string;
  fonctionAuteur: string;
  dateAffichee: string;
  nbActifs: number;
  nouveauxOuvriers: { id: string; prenom: string; nom: string }[];
  suspendusOuvriers: {
    id: string;
    prenom: string;
    nom: string;
    role: string;
    date_changement_statut: string | null;
  }[];
  roster: { id: string; prenom: string; nom: string; role: string; estNouveau: boolean; depuis: string }[];
  statsByActivite: {
    id: string;
    titre: string;
    date_activite: string;
    nbPresent: number;
    nbTotal: number;
  }[];
  presenceActiviteParOuvrier: Record<string, Record<string, string>>;
  statsCultes: { id: string; type: string; date_culte: string; nbPresent: number; nbTotal: number }[];
  presenceCulteParOuvrier: Record<string, Record<string, string>>;
  soldeDebut: number;
  soldeFin: number;
  peutVoirDetailCaisse: boolean;
  mouvementsPeriode: {
    id: string;
    type: string;
    montant: number;
    motif: string | null;
    date_mouvement: string;
  }[];
  blocsSuivi: { nom: string; texte: string | null }[];
}

export function DocumentRapport({
  nomEglise,
  reseau,
  adresse,
  contactLigne2,
  logoUrl,
  deptNom,
  periodeLabel,
  periodeDebut,
  periodeFin,
  reference,
  statutLabel,
  auteurNom,
  fonctionAuteur,
  dateAffichee,
  nbActifs,
  nouveauxOuvriers,
  suspendusOuvriers,
  roster,
  statsByActivite,
  presenceActiviteParOuvrier,
  statsCultes,
  presenceCulteParOuvrier,
  soldeDebut,
  soldeFin,
  peutVoirDetailCaisse,
  mouvementsPeriode,
  blocsSuivi,
}: DocumentRapportProps) {
  return (
    <div className={`${styles.document} ${titillium.variable}`}>
      <article className={styles.page}>
        <header className={styles.letterhead}>
          <div className={styles.letterheadIdentity}>
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className={styles.logo} />
            )}
            <div className={styles.letterheadOrg}>
              {reseau && <div className={styles.network}>{reseau}</div>}
              <div className={styles.church}>{nomEglise}</div>
            </div>
          </div>
          {(adresse || contactLigne2) && (
            <div className={styles.letterheadContact}>
              {adresse}
              {adresse && contactLigne2 && <br />}
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
            Département <strong>{deptNom}</strong> — période <strong>{periodeLabel}</strong>
          </div>

          <div className={styles.idgrid}>
            <div className={styles.idcell}>
              <p className={styles.k}>Référence</p>
              <p className={styles.v}>{reference}</p>
            </div>
            <div className={styles.idcell}>
              <p className={styles.k}>Période couverte</p>
              <p className={styles.v}>{format.date(periodeDebut)} – {format.date(periodeFin)}</p>
            </div>
            <div className={styles.idcell}>
              <p className={styles.k}>Statut</p>
              <p className={styles.v}><span className={styles.statusChip}>{statutLabel}</span></p>
            </div>
            <div className={styles.idcell}>
              <p className={styles.k}>Rédigé par</p>
              <p className={styles.v}>{auteurNom}</p>
            </div>
            <div className={styles.idcell}>
              <p className={styles.k}>Fonction</p>
              <p className={styles.v}>{fonctionAuteur}</p>
            </div>
            <div className={styles.idcell}>
              <p className={styles.k}>Date de soumission</p>
              <p className={styles.v}>{dateAffichee}</p>
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
  );
}
