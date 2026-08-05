# Plan de Projet
## Application de Gestion des Départements d'Église

*Feuille de route en six phases, à mettre en regard du Cahier des Charges (v3).*

---

## Vue d'ensemble

| # | Phase | Statut |
|---|---|---|
| 1 | Conception fonctionnelle | Terminée (mise à jour) |
| 2 | Design UX/UI | En cours |
| 3 | Architecture technique | À venir |
| 4 | Développement | À venir |
| 5 | Tests & recette | À venir |
| 6 | Déploiement & adoption | À venir |

---

## Phase 1 — Conception fonctionnelle *(terminée, mise à jour)*

**Objectif** : cadrer précisément ce que l'application doit faire avant d'engager du temps de design ou de code.

**Réalisé** :
- Cahier des charges complet (utilisateurs, rôles, modèle de données, indicateurs, sécurité)
- Matrice de permissions à 7 rôles, incluant la délégation de l'assignation des rôles secondaires
- Algorithme de santé des départements (seuils définis)
- Gestion de la caisse par département (entrées, sorties, dépenses avec motif)
- Rapport mensuel enrichi (effectifs, activités/présences, caisse, champs qualitatifs)
- Périmètre V1 / V2 arbitré

**Reste à faire avant la phase 2** :
- Choisir le nom définitif du produit, s'il n'est pas encore arrêté

---

## Phase 2 — Design UX/UI *(en cours)*

**Objectif** : traduire le cahier des charges en écrans concrets, et valider les parcours avant d'écrire la moindre ligne de code.

**Direction définie** (réflexion menée selon le design thinking — Empathize, Define, Ideate) :
- Architecture en couches : un socle commun ("Mon espace") pour tous, des modules de département qui s'ajoutent selon le rôle réel, et un module de pilotage pour pasteur/assistant
- Règle d'écran d'accueil à la connexion, selon la responsabilité active la plus élevée de chaque utilisateur
- Contenu détaillé des écrans clés :
  - *Mon espace* (tous) : profil, prochaines activités, historique de présence
  - *Écran de gestion du département* (président, vice-président, secrétaire) : 4 zones — Aujourd'hui, Rapport mensuel, Caisse (sauf secrétaire), Équipe & rôles
  - *Pilotage église* (pasteur, assistant) : statistiques globales, cartes de santé par département

**Reste à faire** :
- Lister et maquetter visuellement les écrans clés (wireframes, puis moyenne fidélité)
- Valider les maquettes avec le pasteur

**Livrables** :
- Maquettes validées de chaque écran clé
- Parcours utilisateur documenté par rôle

**Condition pour passer à la phase 3** : maquettes validées par le pasteur.

---

## Phase 3 — Architecture technique

**Objectif** : traduire le modèle conceptuel en architecture technique concrète et prête à être développée.

**Activités** :
- Choix de la stack (backend, frontend, base de données, hébergement)
- Schéma de base de données détaillé (tables, clés, contraintes) à partir du modèle conceptuel du cahier des charges, incluant la caisse et les statuts d'affectation étendus
- Mise en place du dépôt de code et des environnements (développement, test, production)
- Définition de la politique de sauvegarde des données

**Livrables** :
- Document d'architecture technique
- Schéma de base de données détaillé
- Dépôt de code initialisé, environnements prêts

**Condition pour passer à la phase 4** : architecture validée, environnement de développement opérationnel.

---

## Phase 4 — Développement

**Objectif** : construire l'application par lots livrables plutôt qu'en un seul bloc, pour pouvoir tester et ajuster progressivement.

| Lot | Contenu |
|---|---|
| Lot 1 | Authentification, gestion des ouvriers, des départements, des affectations (avec rôles secondaires) |
| Lot 2 | Activités et présences (présent / absent / excusé + justification optionnelle) |
| Lot 3 | Caisse : mouvements (entrées/sorties), soldes par département |
| Lot 4 | Rapports (effectifs, activités/présences, caisse, champs qualitatifs) et indicateurs globaux |
| Lot 5 | Tableau de bord, algorithme de santé des départements, notifications |

**Livrables** : application fonctionnelle, lot par lot, démontrable en environnement de test après chaque lot.

**Condition pour passer à la phase 5** : les cinq lots livrés et fonctionnels.

---

## Phase 5 — Tests & recette

**Objectif** : vérifier que l'application répond au cahier des charges, en conditions réelles.

**Activités** :
- Tests fonctionnels par rôle (vérifier que chaque rôle peut faire exactement ce qui est prévu — et rien de plus), en particulier pour la caisse vu sa sensibilité
- Test pilote avec un ou deux départements réels, idéalement dirigés par des présidents moteurs
- Ajustement des seuils de l'algorithme de santé si les données réelles montrent qu'ils sont trop stricts ou trop souples
- Correction des anomalies identifiées

**Livrables** :
- Rapport de recette
- Liste des anomalies corrigées

**Condition pour passer à la phase 6** : recette validée par le pasteur.

---

## Phase 6 — Déploiement & adoption

**Objectif** : mettre l'application en service et garantir qu'elle soit réellement utilisée.

**Activités** :
- Mise en production
- Création des comptes initiaux (pasteur, assistants, présidents de département)
- Formation courte de chaque rôle à ses propres écrans, en particulier la caisse pour présidents/vice-présidents/trésoriers
- Accompagnement pendant les premières semaines d'utilisation
- Point de suivi à 30 jours pour ajuster si besoin

**Livrables** :
- Application en production
- Supports de formation par rôle
- Comptes créés et fonctionnels

**Et après** : les retours d'usage des premiers mois alimentent la préparation de la Version 2 (indicateurs personnalisables, OTP, export PDF des rapports, fonctionnalités comptables avancées).

---

## Points d'attention transverses

- **L'adoption est souvent le vrai risque, plus que la technique.** Prévoir un accompagnement humain réel pendant les premières semaines, pas seulement un mode d'emploi écrit.
- **La caisse demande une vigilance particulière** : même sans circuit de validation formel, la traçabilité (qui a saisi quoi, et quand) doit être fiable et consultable, puisqu'il s'agit d'argent.
- **Choisir les départements pilotes avec soin** (phase 5) : un président motivé donnera des retours utiles ; un président peu impliqué faussera l'évaluation.
- **Le calendrier précis** (durée de chaque phase) dépend des ressources disponibles (équipe interne, prestataire, bénévole) — il pourra être estimé une fois l'architecture technique de la phase 3 connue.

## Prochaine action concrète

La direction de l'interface étant définie, la suite logique est de maquetter visuellement les écrans clés — en commençant par l'écran de gestion du département (le plus riche, avec ses 4 zones) et le tableau de pilotage du pasteur.
