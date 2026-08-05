# Backlog Produit
## Application de Gestion des Départements d'Église

*Organisé par epic, alignés sur les lots de développement (Phase 4 du plan de projet). L'ordre des epics reflète une priorité naturelle au sein de la V1.*

---

## Epic 1 — Authentification & comptes *(Lot 1)*

| ID | User Story | Critères d'acceptation |
|---|---|---|
| US1.1 | En tant que **pasteur**, je veux ajouter un ouvrier avec ses informations de base, afin de centraliser les profils de l'église. | Formulaire avec champs obligatoires (nom, postnom, prénom, sexe, date de naissance, statut, email) ; un compte est créé automatiquement à chaque ajout et un lien d'initialisation de mot de passe est envoyé par email. |
| US1.2 | En tant qu'**assistant pasteur**, je veux ajouter ou modifier un ouvrier, afin d'aider le pasteur dans la gestion courante. | Mêmes droits que le pasteur sur cette action, pas sur la désactivation. |
| US1.3 | En tant que **pasteur**, je veux désactiver un ouvrier, afin de refléter son départ définitif sans perdre l'historique. | L'ouvrier désactivé n'apparaît plus dans les listes actives ; ses données passées (présences, rapports) restent consultables. |
| US1.4 | En tant qu'**ouvrier disposant d'un compte**, je veux définir mon mot de passe via un lien reçu par email, afin d'accéder à l'application en sécurité. | Lien à usage unique, expirable ; pas de mot de passe transmis en clair. |
| US1.5 | En tant qu'**utilisateur**, je veux récupérer l'accès à mon compte en cas de mot de passe oublié. | Lien de réinitialisation envoyé par email. |
| US1.6 | En tant qu'**utilisateur**, je veux me connecter avec mon email et mon mot de passe, et atterrir sur l'écran qui correspond à mon rôle le plus élevé. | Voir la règle d'écran d'accueil (cahier des charges §12). |

## Epic 2 — Ouvriers, départements & affectations *(Lot 1)*

| ID | User Story | Critères d'acceptation |
|---|---|---|
| US2.1 | En tant que **pasteur ou assistant**, je veux affecter un ouvrier à un ou plusieurs départements. | Un ouvrier peut être affecté à plusieurs départements simultanément, avec un rôle "membre" par défaut. |
| US2.2 | En tant que **pasteur**, je veux nommer ou changer le président d'un département. | Action réservée au pasteur uniquement, pas délégable. |
| US2.3 | En tant que **président**, je veux assigner un rôle secondaire (vice-président, secrétaire, trésorier, membre) à un ouvrier déjà affecté à mon département. | Ne fonctionne que sur les ouvriers déjà affectés ; ne permet pas de nommer un président. |
| US2.4 | En tant que **pasteur, assistant ou président (pour son propre département)**, je veux marquer un ouvrier comme suspendu ou le réactiver, afin de refléter une mise en pause temporaire sans perdre l'historique. | Statut affectation passe à "suspendu" puis "actif" ; historique conservé ; le président ne peut le faire que sur les ouvriers de son département. |
| US2.5 | En tant que **pasteur ou assistant**, je veux marquer un ouvrier comme ayant quitté un département, afin de refléter un départ définitif. | Statut affectation passe à "quitté" ; historique conservé ; action non disponible pour le président (cohérent avec l'interdiction de retirer un ouvrier de son département). |
| US2.6 | En tant que **président**, je veux voir la liste des ouvriers de mon département avec leur rôle et leur statut (actif/suspendu) actuels. | Vue "Équipe & rôles" de l'écran de gestion du département ; les ouvriers suspendus sont visuellement distincts, avec une action pour les réactiver. |

## Epic 3 — Activités & présences *(Lot 2)*

| ID | User Story | Critères d'acceptation |
|---|---|---|
| US3.1 | En tant que **président, vice-président ou secrétaire**, je veux créer une activité pour mon département (titre, date, heure, lieu, description, responsable). | Création manuelle à chaque fois, pas de récurrence automatique. |
| US3.2 | En tant que **président, vice-président ou secrétaire**, je veux enregistrer la présence de chaque ouvrier à une activité (présent/absent/excusé) en moins d'une minute. | Pointage en un tap par ouvrier, optimisé mobile. |
| US3.3 | En tant que **président, vice-président ou secrétaire**, je veux ajouter une justification optionnelle à une absence excusée. | Champ texte libre, jamais obligatoire. |
| US3.4 | En tant qu'**ouvrier**, je veux consulter mes prochaines activités et mon historique de présence. | Présenté positivement (ex : "12 présences sur 14 ce mois"), visible dans "Mon espace". |

## Epic 4 — Caisse *(Lot 3)*

| ID | User Story | Critères d'acceptation |
|---|---|---|
| US4.1 | En tant que **président, vice-président ou trésorier**, je veux enregistrer un mouvement de caisse (entrée ou sortie). | Montant, date, type obligatoires. |
| US4.2 | En tant que **président, vice-président ou trésorier**, je veux renseigner un motif obligatoire pour chaque sortie. | Impossible de valider une sortie sans motif. |
| US4.3 | En tant que **président, vice-président ou trésorier**, je veux consulter le solde actuel et l'historique chronologique des mouvements de mon département. | Solde recalculé en continu ; chaque mouvement affiche auteur et date. |
| US4.4 | En tant que **membre ou trésorier d'un département**, je veux consulter les statistiques de mon département. | Lecture seule, sans bouton d'action pour les non-gestionnaires. |

## Epic 5 — Rapports *(Lot 4)*

| ID | User Story | Critères d'acceptation |
|---|---|---|
| US5.1 | En tant que **président, vice-président ou secrétaire**, je veux générer un rapport mensuel pré-rempli avec les noms des ouvriers concernés et le détail par activité, afin d'avoir des éléments réellement actionnables plutôt que de simples totaux. | Calcul automatique à partir des données déjà saisies, aucune ressaisie ; les effectifs listent les noms (adhésions, suspensions) et chaque activité affiche son taux de présence. |
| US5.2 | En tant que **président, vice-président ou secrétaire**, je veux compléter mon rapport avec difficultés, besoins et objectifs du mois. | Trois champs de texte libre, optionnels. |
| US5.3 | En tant que **président, vice-président ou secrétaire**, je veux soumettre mon rapport. | Visible immédiatement par le pasteur, sans validation préalable. |
| US5.4 | En tant que **pasteur ou assistant**, je veux consulter les rapports de tous les départements. | Accès en lecture à l'ensemble des rapports soumis. |
| US5.5 | En tant que **pasteur ou assistant**, je veux consulter un rapport global agrégeant l'état de tous les départements. | Vue de synthèse, statistiques générales et évolution mensuelle. |

## Epic 6 — Tableau de bord & santé des départements *(Lot 5)*

| ID | User Story | Critères d'acceptation |
|---|---|---|
| US6.1 | En tant que **pasteur ou assistant**, je veux voir, dès la connexion, les statistiques globales de l'église. | Ouvriers actifs, départements, taux de présence global, activités du mois. |
| US6.2 | En tant que **pasteur ou assistant**, je veux voir la pastille de santé (vert/orange/rouge) de chaque département. | Calcul selon les règles du cahier des charges §6, fenêtre glissante de 30 jours. |
| US6.3 | En tant que **pasteur ou assistant**, je veux cliquer sur un département orange ou rouge pour voir le détail des alertes. | Accès direct au détail, sans passer par un menu général. |
| US6.4 | En tant que **président, vice-président ou secrétaire**, je veux atterrir directement sur la gestion de mon département à la connexion. | Si plusieurs départements gérés, atterrissage sur une liste "Mes départements". |
| US6.5 | En tant que **membre simple ou trésorier**, je veux atterrir sur mon espace personnel à la connexion. | Conforme à la règle d'écran d'accueil. |
| US6.6 | En tant que **membre ou trésorier d'un département**, je veux voir un tableau de bord en lecture seule de ce département (taux de présence, activités du mois, solde de caisse, pastille de santé, ouvriers actifs et suspendus nommés), afin de rester informé sans avoir accès aux actions de gestion. | Aucun bouton d'action ; les ouvriers suspendus sont listés avec la date depuis laquelle ils le sont. |

## Epic 7 — Notifications *(Lot 5)*

| ID | User Story | Critères d'acceptation |
|---|---|---|
| US7.1 | En tant qu'**ouvrier d'un département**, je veux être notifié dans l'application lors d'une nouvelle activité. | Notification in-app, sans email. |
| US7.2 | En tant qu'**ouvrier d'un département**, je veux recevoir un rappel avant une activité à laquelle je suis attendu. | Déclenché un délai fixe avant l'activité. |
| US7.3 | En tant que **président, vice-président ou secrétaire**, je veux être notifié si le rapport mensuel de mon département est en retard. | Notifie aussi le pasteur/les assistants pour visibilité. |
| US7.4 | En tant qu'**ouvrier**, je veux être notifié lorsque je suis affecté à un nouveau département. | Notification immédiate à l'affectation. |

## Epic 8 — V2 *(reporté)*

| ID | User Story |
|---|---|
| US8.1 | En tant que **président**, je veux définir mes propres indicateurs de suivi (ex : âmes gagnées), afin de mesurer ce qui compte pour mon département. |
| US8.2 | En tant qu'**utilisateur**, je veux me connecter avec un code OTP par SMS en complément du mot de passe, pour renforcer la sécurité. |
| US8.3 | En tant que **pasteur ou assistant**, je veux exporter un rapport en PDF, afin de le partager ou l'archiver. |
| US8.4 | En tant que **président, vice-président ou secrétaire**, je veux assigner un besoin ou un objectif à un responsable du département et le cocher quand il est atteint, afin de suivre sa réalisation dans le temps plutôt que de le décrire une seule fois en texte libre. |

---

## Prochaine étape

Ce backlog peut maintenant servir de base aux maquettes visuelles (Phase 2) : chaque epic correspond à un ou plusieurs écrans à prototyper, et chaque user story devient un cas à vérifier lors des tests utilisateurs.
