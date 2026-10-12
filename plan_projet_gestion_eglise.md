# Plan de Projet
## Application de Gestion des Départements d'Église

*Feuille de route en six phases, à mettre en regard du Cahier des Charges (v3).*

*Mise à jour du statut : 2026-10-12, d'après l'état réel du code (build, routes, historique Git) plutôt que d'après une estimation a priori.*

---

## Vue d'ensemble

| # | Phase | Statut |
|---|---|---|
| 1 | Conception fonctionnelle | Terminée |
| 2 | Design UX/UI | Terminée |
| 3 | Architecture technique | Terminée |
| 4 | Développement | Terminée pour l'essentiel (lots 1 à 5 livrés, quelques écarts — voir détail) |
| 5 | Tests & recette | À faire |
| 6 | Déploiement & adoption | Partiel (pipeline Vercel/Supabase opérationnel, adoption réelle non engagée) |

---

## Phase 1 — Conception fonctionnelle *(terminée)*

**Réalisé** :
- Cahier des charges complet (utilisateurs, rôles, modèle de données, indicateurs, sécurité)
- Matrice de permissions à 7 rôles, incluant la délégation de l'assignation des rôles secondaires
- Algorithme de santé des départements (seuils définis)
- Gestion de la caisse par département (entrées, sorties, dépenses avec motif)
- Rapport mensuel enrichi (effectifs, activités/présences, caisse, champs qualitatifs)
- Périmètre V1 / V2 arbitré

---

## Phase 2 — Design UX/UI *(terminée)*

**Réalisé** :
- Architecture en couches confirmée dans le code : "Mon espace" (socle commun), modules de département (`departements/[id]/...`), module de pilotage (`pilotage/`)
- Maquettes haute fidélité produites pour tous les écrans clés (fichiers `maquette_*.html` à la racine : connexion, mon espace, gestion département, équipe & rôles, caisse, activités/présences, rapport mensuel, pilotage pasteur, gestion ouvriers, alertes)
- Parcours par rôle traduits en routes réelles dans `app/(app)/`

---

## Phase 3 — Architecture technique *(terminée)*

**Réalisé** :
- Stack finalisée et en place : Next.js (App Router) + TypeScript, Tailwind, shadcn/ui, Supabase (Postgres + Auth + Storage), `@supabase/supabase-js` + `@supabase/ssr`, pas d'ORM
- Schéma de base de données détaillé (`schema.sql`) et policies RLS + fonctions RPC pour les actions sensibles (`rls_policies.sql`)
- Dépôt Git initialisé, historique de +100 commits
- Pipeline de déploiement Vercel (frontend) + Supabase Cloud (backend) opérationnel

**Non vérifié** : politique de sauvegarde des données formalisée (à confirmer côté Supabase Cloud — plan de rétention/backup du palier utilisé).

---

## Phase 4 — Développement *(terminée pour l'essentiel)*

**Objectif** : construire l'application par lots livrables plutôt qu'en un seul bloc.

| Lot | Contenu | Statut |
|---|---|---|
| Lot 1 | Authentification, gestion des ouvriers, des départements, des affectations (avec rôles secondaires) | ✅ Livré |
| Lot 2 | Activités et présences (présent / absent / excusé + justification optionnelle) | ✅ Livré |
| Lot 3 | Caisse : mouvements (entrées/sorties), soldes par département | ✅ Livré |
| Lot 4 | Rapports (effectifs, activités/présences, caisse, champs qualitatifs) et indicateurs globaux | ✅ Livré |
| Lot 5 | Tableau de bord, algorithme de santé des départements, notifications | ✅ Livré |

**Constat sur le code actuel** (vérifié par build + inspection des routes) :
- `npm run build` passe sans erreur, ~40 routes générées couvrant l'auth, les ouvriers, les départements (activités, caisse, équipe, rapports, suivi), le pilotage et les notifications
- Les règles strictes du `CLAUDE.md` sont respectées dans les zones vérifiées : RPC dédiées pour les actions sensibles sur `affectations`, pas d'`update()` direct constaté
- Des fonctionnalités dépassent le périmètre initial du backlog V1 :
  - Module **Suivi** (indicateurs personnalisés par département, épic US8.1) — classé V2 dans ce plan à l'origine, mais déjà construit
  - Module **Cultes** (gestion des cultes, hors épics du backlog initial)
  - Photo de profil auto-gérable, gestion fine du compte (`mon-compte`)
- Écart identifié : ce fichier de plan indiquait encore "Phase 2 en cours" / "Phase 4 à venir" alors que le développement était largement avancé — statut corrigé par cette mise à jour

---

## Phase 5 — Tests & recette *(à faire)*

**Objectif** : vérifier que l'application répond au cahier des charges, en conditions réelles.

**Constat** : aucun test automatisé dans le dépôt (pas de vitest/jest/playwright/cypress détecté). La vérification du respect des permissions par rôle repose uniquement sur relecture de code à ce stade.

**Activités restantes** :
- Tests fonctionnels par rôle (vérifier que chaque rôle peut faire exactement ce qui est prévu — et rien de plus), en particulier pour la caisse vu sa sensibilité
- Test pilote avec un ou deux départements réels, idéalement dirigés par des présidents moteurs
- Ajustement des seuils de l'algorithme de santé si les données réelles montrent qu'ils sont trop stricts ou trop souples
- Correction des anomalies identifiées
- Décider si des tests automatisés (au moins sur les RPC sensibles et les policies RLS) sont ajoutés avant la mise en production réelle, ou si la recette manuelle suffit pour le volume de cette église

**Livrables** :
- Rapport de recette
- Liste des anomalies corrigées

**Condition pour passer à la phase 6** : recette validée par le pasteur.

---

## Phase 6 — Déploiement & adoption *(partielle)*

**Réalisé** :
- Pipeline technique en place : déploiement Vercel actif, backend Supabase Cloud lié

**Reste à faire** :
- Création des comptes réels (pasteur, assistants, présidents de département) — à confirmer si déjà fait ou encore fictif/test
- Formation courte de chaque rôle à ses propres écrans, en particulier la caisse pour présidents/vice-présidents/trésoriers
- Accompagnement pendant les premières semaines d'utilisation
- Point de suivi à 30 jours pour ajuster si besoin

**Livrables** :
- Application en production avec comptes réels actifs
- Supports de formation par rôle

**Et après** : les retours d'usage des premiers mois alimentent la préparation de la Version 2 (OTP, export PDF des rapports, fonctionnalités comptables avancées — les indicateurs personnalisables initialement prévus en V2 sont déjà livrés en V1).

---

## Points d'attention transverses

- **L'adoption est souvent le vrai risque, plus que la technique.** Prévoir un accompagnement humain réel pendant les premières semaines, pas seulement un mode d'emploi écrit.
- **La caisse demande une vigilance particulière** : même sans circuit de validation formel, la traçabilité (qui a saisi quoi, et quand) doit être fiable et consultable, puisqu'il s'agit d'argent.
- **Choisir les départements pilotes avec soin** (phase 5) : un président motivé donnera des retours utiles ; un président peu impliqué faussera l'évaluation.
- **L'absence de tests automatisés** devient un risque croissant à mesure que le code grossit (+100 commits) — à surveiller si le rythme de modifications s'accélère encore.

## Prochaine action concrète

Le développement des 5 lots étant fait, la priorité passe à la **Phase 5** : organiser une recette fonctionnelle par rôle (en particulier la caisse), puis lancer un test pilote avec un ou deux départements réels avant toute généralisation.
