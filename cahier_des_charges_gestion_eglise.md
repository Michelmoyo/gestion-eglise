# Cahier des Charges
## Application de Gestion des Départements d'Église

*Version 4 — tableau de bord ouvrier, statut actif/suspendu visible, rapport enrichi par les noms*

---

## 1. Présentation du Projet

### Nom provisoire
ChurchFlow, Ecclesia Manager ou autre nom à définir.

### Contexte
Les pasteurs ont souvent des difficultés à suivre efficacement la vie des départements de l'église :
- Présence des ouvriers aux activités spirituelles
- Activités réalisées par les départements
- Niveau d'engagement des membres
- État de santé des départements
- Suivi des responsables

L'application vise à fournir un tableau de bord permettant au pasteur et à ses assistants d'avoir une vue globale et détaillée de l'église.

### Périmètre
- **Déploiement** : une seule église (pas de gestion multi-église / multi-tenant).
- **Plateforme** : application web, consultable depuis un navigateur. Design responsive pour les écrans mobiles, notamment pour les ouvriers qui consulteront surtout depuis leur téléphone.

---

## 2. Objectifs

### Objectif principal
Permettre au leadership pastoral de suivre en temps réel :
- les ouvriers ;
- les départements ;
- les activités ;
- les présences ;
- les indicateurs de performance ;
- la santé globale de l'église.

### Objectifs spécifiques
- Centraliser les informations des ouvriers.
- Faciliter le suivi des départements.
- Mesurer l'engagement spirituel.
- Générer automatiquement des rapports.
- Identifier rapidement les départements en difficulté.

---

## 3. Utilisateurs et Rôles

Un ouvrier peut occuper des rôles différents selon le département : par exemple président d'un département et simple membre d'un autre. Les rôles ci-dessous (au-delà de pasteur/assistant) sont donc rattachés à l'affectation d'un ouvrier à un département, pas à l'ouvrier lui-même.

### 3.1 Pasteur Principal
Gestion complète de l'application :
- Ajouter, modifier, désactiver un ouvrier
- Affecter un ouvrier à un département
- Nommer ou changer le président d'un département
- Consulter tous les rapports
- Consulter les statistiques globales

### 3.2 Assistant Pasteur
- Ajouter, modifier un ouvrier
- Affecter aux départements
- Consulter les rapports
- Consulter les statistiques globales

### 3.3 Président de Département
- Voir son département
- Créer des activités, enregistrer les présences
- Soumettre des rapports
- Enregistrer des mouvements de caisse
- Assigner les rôles secondaires (vice-président, secrétaire, trésorier, membre) parmi les ouvriers déjà affectés à son département
- Suspendre ou réactiver un ouvrier de son département (sans le retirer définitivement)
- Voir les statistiques de son département

**Restrictions** — ne peut pas :
- créer ou supprimer un ouvrier ;
- affecter un ouvrier à un département, ni le marquer comme ayant quitté (départ définitif) ;
- nommer un nouveau président (réservé au pasteur) ;
- modifier les données globales de l'église.

### 3.4 Vice-président de Département
Mêmes permissions opérationnelles que le président : créer des activités, enregistrer les présences, soumettre des rapports, enregistrer des mouvements de caisse, voir les statistiques du département — à l'exception de l'assignation des rôles secondaires, réservée au président. Pensé comme un binôme/remplaçant du président.

### 3.5 Secrétaire de Département
Rôle d'appui administratif élargi : peut créer des activités, enregistrer les présences, et **soumettre le rapport mensuel**. N'a accès ni à la caisse ni à l'assignation des rôles secondaires, réservée au président.

### 3.6 Trésorier de Département
Rôle désormais pleinement opérationnel : peut enregistrer les mouvements de caisse (entrées, sorties, dépenses avec motif) de son département et consulter les statistiques du département. Ne crée pas d'activités, n'enregistre pas les présences, ne soumet pas le rapport, et ne peut pas assigner de rôles.

### 3.7 Ouvrier (Membre)
- Consulter ses présences
- Consulter ses activités
- Recevoir des notifications
- Voir son profil
- Voir un tableau de bord en lecture seule de chaque département où il est affecté (statistiques, ouvriers actifs et suspendus nommés) — également accessible au trésorier

### 3.8 Matrice de permissions

| Action | Pasteur | Assistant | Président | Vice-président | Secrétaire | Trésorier | Membre/Ouvrier |
|---|---|---|---|---|---|---|---|
| Créer / modifier un ouvrier | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Désactiver un ouvrier | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Affecter à un département | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Suspendre / réactiver un ouvrier de son département (sans le retirer) | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Marquer un ouvrier comme ayant quitté un département (définitif) | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Nommer / changer le président d'un département | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Assigner un rôle secondaire (VP, secrétaire, trésorier, membre) | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Créer une activité (son département) | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Enregistrer les présences (son département) | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Soumettre un rapport (son département) | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Enregistrer un mouvement de caisse (son département) | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Voir les statistiques de son département | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Voir les statistiques globales de l'église | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Consulter son propre profil / ses présences | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 4. Modèle de Données

### 4.1 Ouvrier
Informations :
- Nom, Postnom, Prénom
- Sexe
- Date de naissance
- Téléphone
- Adresse
- Email *(obligatoire)*
- Date d'intégration
- Statut (Actif / Inactif)
- Photo

Un ouvrier peut appartenir à plusieurs départements simultanément (ex : Chorale + Évangélisation + Accueil).

### 4.2 Département
Informations :
- Nom du département
- Description
- Date de création
- Nombre d'ouvriers *(calculé à partir des affectations actives)*

Le président et le vice-président d'un département ne sont **pas** stockés comme des champs séparés sur le département : ils sont déduits du rôle renseigné sur l'affectation (une seule source de vérité, pas de risque d'incohérence).

Exemples de départements : Chorale, Évangélisation, Intercession, Accueil, Jeunesse, Protocole, Communication.

### 4.3 Affectation (Ouvrier ↔ Département)
Table de liaison qui permet l'appartenance multi-département et conserve l'historique :
- Ouvrier concerné
- Département concerné
- Rôle dans ce département : membre, secrétaire, trésorier, président, vice-président
- Date d'affectation
- Statut : **actif / suspendu / quitté**. Une suspension est une mise en pause temporaire (sanction, absence prolongée...) sans perte d'historique ; un départ ("quitté") est définitif. Dans les deux cas, les présences et activités passées de l'ouvrier dans ce département restent conservées.

### 4.4 Activité
Chaque département crée ses propres activités, manuellement (pas de génération automatique d'occurrences récurrentes — y compris pour les activités hebdomadaires comme les répétitions).
- Titre
- Département
- Date, Heure, Lieu
- Description
- Responsable (un ouvrier désigné pour cette activité précise)

Exemples :
- *Évangélisation* : sortie évangélique, croisade, porte-à-porte
- *Chorale* : répétition, concert, animation du culte
- *Intercession* : veillée, nuit de prière, jeûne

### 4.5 Présence
Pour chaque activité, chaque ouvrier concerné est enregistré avec un statut :
- Présent
- Absent
- Excusé — avec un champ de justification optionnel en texte libre (jamais obligatoire, pour ne pas alourdir la saisie).

Présences globales suivies pour toute l'église : culte dominical, intercession, nuit de prière, retraite spirituelle, formation.

### 4.6 Rapport
- Département (ou rapport global)
- Période concernée
- Données calculées automatiquement : effectifs nommés (ouvriers ayant adhéré, suspendus, avec leur date), liste des activités du mois avec le taux de présence de chacune, caisse du mois (voir §4.7)
- Champs qualitatifs en texte libre : difficultés, besoins, objectifs du mois
- Auteur (président, vice-président ou secrétaire), date de soumission

Soumission simple, sans circuit de validation par le pasteur — un rapport soumis est immédiatement consultable.

### 4.7 Mouvement de Caisse
Nouvelle entité pour le suivi financier simple d'un département :
- Département concerné
- Type : entrée ou sortie
- Montant
- Date
- Motif (obligatoire pour une sortie)
- Auteur (président, vice-président ou trésorier)
- Date de saisie

Le solde d'un département se calcule en continu : somme des entrées moins somme des sorties. Il n'y a pas de circuit de validation pour les mouvements de caisse à ce stade — la traçabilité (auteur + date) sert de garde-fou.

### 4.8 Utilisateur (compte de connexion)
Distinct de la fiche Ouvrier : un ouvrier n'a pas forcément de compte de connexion.
- Compte créé **automatiquement** à l'ajout de chaque ouvrier — l'email étant désormais obligatoire, tous les ouvriers disposent d'un compte de connexion.
- L'ouvrier reçoit un email contenant un lien pour définir lui-même son mot de passe (pas de mot de passe temporaire transmis en clair).
- Email, mot de passe (haché), rôle d'accès global (pasteur, assistant) — les rôles de département viennent de l'affectation (§4.3).

### 4.9 Indicateur *(reporté en V2 — voir §13)*
Architecture prévue pour plus tard : une définition d'indicateur par département (nom, unité) et des valeurs saisies par période, pour que chaque département puisse créer ses propres KPI sans modification du schéma de données.

---

## 5. Indicateurs de Suivi (V1)

### Indicateurs globaux
- Présence au culte dominical (nombre, pourcentage)
- Présence à l'intercession (nombre, pourcentage)
- Présence à la nuit de prière (nombre, pourcentage)

### Indicateurs personnalisables par département
Reportés en V2 (voir §13). Exemples prévus pour plus tard : nombre de sorties / âmes gagnées (Évangélisation), répétitions réalisées / taux de présence (Chorale), nombre de veillées / heures de prière (Intercession).

---

## 6. Algorithme de Santé des Départements

Calcul effectué sur une **fenêtre glissante de 30 jours**, avec des seuils fixés à la conception (pas de réglage par le pasteur dans l'interface, mais ajustables dans le code si l'usage le justifie).

### Rouge — en difficulté
Au moins une des conditions suivantes :
- Aucune activité enregistrée depuis plus de 30 jours
- Taux de présence moyen inférieur à 50 %
- Aucun rapport soumis depuis 60 jours
- Aucune action du président ou du vice-président (présence ou activité enregistrée) depuis 30 jours

### Orange — à surveiller
Aucune condition rouge, mais au moins une des conditions suivantes :
- Taux de présence moyen entre 50 % et 70 %
- Baisse de plus de 15 points par rapport à la fenêtre de 30 jours précédente
- Rapport non soumis depuis plus de 30 jours
- Un même ouvrier absent à 3 activités consécutives du département

### Vert — en bonne santé
Aucune condition rouge ni orange.

### Alertes associées
- Responsable inactif
- Faible participation
- Aucun rapport envoyé
- Baisse des activités
- Ouvriers absents plusieurs fois

---

## 7. Tableau de Bord Pasteur

### Vue générale
- Nombre total d'ouvriers
- Nombre de départements
- Taux de présence global
- Activités réalisées ce mois

### Santé des départements
Affichage vert / orange / rouge selon les règles du §6, avec accès au détail des alertes par département.

---

## 8. Gestion de la Caisse (Comptabilité du Département)

Volet financier simple, par département — pas de comptabilité multi-devises ni de budgets prévisionnels à ce stade (voir pistes V2 en §13).

- Chaque département a une caisse dont le solde est calculé en continu à partir des mouvements enregistrés (§4.7).
- Un mouvement est une entrée ou une sortie, avec un motif obligatoire pour les sorties (ex : "achat de partitions", "transport équipe").
- Saisie réservée au président, au vice-président et au trésorier du département concerné.
- Le solde et la liste des mouvements du mois alimentent automatiquement le rapport mensuel (§9).

---

## 9. Rapports

### Rapport Département
Généré en grande partie automatiquement à partir des données déjà saisies dans l'application :
- **Effectifs** : noms et dates des ouvriers ayant adhéré ce mois, et des ouvriers suspendus (pas seulement des totaux — un nom est plus actionnable qu'un chiffre)
- **Activités** : liste des activités du mois, chacune avec son taux de présence
- **Caisse** : solde du mois, liste des dépenses avec leur motif
- **Texte libre** : difficultés, besoins, objectifs du mois — complété manuellement avant soumission

Soumis par le président, le vice-président ou le secrétaire. Soumission simple, sans validation par le pasteur — immédiatement consultable une fois soumis.

### Rapport Global
- État des départements
- Statistiques générales
- Évolution mensuelle

---

## 10. Notifications

Notifications **dans l'application** pour les événements courants, avec ces destinataires :

| Déclencheur | Destinataires |
|---|---|
| Nouvelle activité créée | Ouvriers affectés au département concerné |
| Rappel d'activité | Mêmes destinataires + le responsable désigné |
| Rapport en retard | Président / vice-président / secrétaire du département concerné, et le pasteur/les assistants pour visibilité |
| Affectation à un département | L'ouvrier concerné |

**Email** réservé à deux cas qui ne peuvent pas passer par une notification in-app (l'utilisateur n'a pas encore accès) :
- Création de compte (lien d'initialisation de mot de passe)
- Récupération de mot de passe oublié

---

## 11. Sécurité

### Authentification (V1)
- Email + mot de passe (haché)
- Lien d'initialisation de mot de passe envoyé par email à la création du compte
- Récupération de mot de passe par email

### Authentification (V2 — reportée)
- Numéro de téléphone + OTP en option, en complément de l'email + mot de passe. Le choix du fournisseur SMS dépendra du pays de déploiement (coût et couverture variables selon les opérateurs).

### Autorisation
Gestion stricte des rôles et permissions, selon la matrice du §3.8.

---

## 12. Interface & Expérience Utilisateur

### Principe : un socle commun, des couches additionnelles
Chaque utilisateur dispose d'un espace personnel commun à tous, peu importe son rôle. Des modules supplémentaires s'ajoutent selon le ou les rôles réellement actifs — le rôle se lit département par département, pas globalement sur la personne.

- **Couche 1 — Mon espace** *(tous)* : photo, nom, département(s), prochaines activités, historique de présence présenté positivement (ex : "12 présences sur 14 ce mois").
- **Couche 2 — Modules de département**, selon le rôle dans chaque département :
  - *Membre, trésorier* : tableau de bord en lecture seule (taux de présence, activités du mois, solde de caisse, pastille de santé, liste nommée des ouvriers actifs et suspendus) ; le trésorier y ajoute la saisie de la caisse (écran dédié, transactions détaillées).
  - *Président, vice-président, secrétaire* : écran de gestion à 4 zones — **Aujourd'hui** (activités/présences du jour), **Rapport mensuel**, **Caisse** (sauf secrétaire), **Équipe & rôles** (consultable par les trois ; affiche le statut actif/suspendu de chaque ouvrier ; l'action d'assigner un rôle ou de réactiver un suspendu est réservée au président).
- **Couche 3 — Pilotage église** *(pasteur, assistant)* : tableau de bord global (statistiques de l'église, santé de tous les départements, accès direct aux alertes).

### Règle d'écran d'accueil à la connexion
L'écran d'accueil correspond à la couche la plus haute où la personne a une responsabilité active :
1. Pasteur / Assistant → Pilotage église
2. Président / Vice-président / Secrétaire d'au moins un département → gestion de ce département (ou liste des départements gérés, s'il y en a plusieurs)
3. Trésorier et membre simple → Mon espace

---

## 13. Périmètre des Versions

### Version 1 (MVP)
- Gestion des ouvriers, départements, affectations multi-département avec rôles (membre, secrétaire, trésorier, président, vice-président)
- Activités et présences (présent / absent / excusé + justification optionnelle)
- Gestion de la caisse par département (entrées, sorties, dépenses avec motif)
- Rapports enrichis (effectifs, activités/présences, caisse, champs qualitatifs)
- Tableau de bord : santé des départements (§6) + statistiques globales
- Architecture d'interface en couches (Mon espace, modules de département, pilotage) avec règle d'écran d'accueil par rôle
- Notifications dans l'application
- Authentification email + mot de passe

### Version 2 (évolutions futures)
- Indicateurs personnalisables par département (§4.9, §5)
- Objectifs et besoins assignables à un responsable du département (président, vice-président ou secrétaire), avec statut (à faire / atteint) et date de réalisation — remplace les champs de texte libre actuels par une liste suivie dans le temps, indépendamment du rythme mensuel du rapport
- Authentification par OTP (téléphone)
- Export PDF des rapports
- Fonctionnalités comptables avancées (budgets prévisionnels, export comptable)
- Éventuel réglage des seuils de l'algorithme de santé depuis une interface de paramètres
