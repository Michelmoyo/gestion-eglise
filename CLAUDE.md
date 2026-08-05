# CLAUDE.md

Ce fichier donne le contexte du projet à Claude Code. À lire avant toute génération de code.

## Vue d'ensemble

Application web de gestion des départements d'une église (une seule église, pas de multi-tenant). Voir les documents de référence ci-dessous pour le détail fonctionnel — ne pas réinventer les règles métier, elles sont déjà tranchées.

## Documents de référence (à la racine du projet)

- `cahier_des_charges_gestion_eglise.md` — périmètre fonctionnel complet : rôles, permissions, modèle de données, algorithme de santé des départements, architecture d'interface
- `backlog_produit_gestion_eglise.md` — user stories par epic, avec critères d'acceptation
- `schema.sql` — schéma de base de données PostgreSQL
- `rls_policies.sql` — policies RLS et fonctions RPC pour les actions sensibles

En cas de doute sur une règle métier (qui peut faire quoi, comment se calcule la santé d'un département...), se référer à ces fichiers plutôt que de décider arbitrairement.

## Stack technique (finalisée — ne pas dévier sans en discuter)

| Couche | Choix | Pourquoi |
|---|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript | Mobile-first natif, Server Components + Server Actions, écosystème très documenté |
| Styles | Tailwind CSS | Cohérent avec les maquettes mobile-first déjà validées |
| Composants UI | shadcn/ui | Composants accessibles déjà stylés (formulaires, boutons, cartes) — éviter de réinventer des composants de base |
| Formulaires | react-hook-form + zod | Validation type-safe, cohérente avec TypeScript |
| Backend | Supabase (PostgreSQL + Auth + Storage) | Un seul service pour la base, l'authentification et les photos des ouvriers |
| Accès aux données | `@supabase/supabase-js` + `@supabase/ssr` | **Pas d'ORM, pas de Prisma.** Le client Supabase respecte nativement les policies RLS via le JWT de l'utilisateur connecté ; un ORM avec une connexion directe contournerait tout le travail de sécurité fait dans `rls_policies.sql` |
| Schéma / migrations | SQL brut (`schema.sql`, `rls_policies.sql`), appliqué via la CLI Supabase ou le SQL editor | Une seule source de vérité, pas de double schéma à synchroniser |
| Hébergement frontend | Vercel | Palier gratuit suffisant pour une seule église |
| Hébergement backend | Supabase Cloud | Palier gratuit suffisant pour ce volume d'utilisateurs |
| Emails transactionnels | Flux intégrés de Supabase Auth (invitation, réinitialisation de mot de passe) | Pas de service tiers en V1 ; passer à un SMTP personnalisé (ex. Resend) seulement si les limites du palier gratuit deviennent un problème |

## Authentification — flux de création de compte

Ce n'est pas un signup classique : le pasteur ou l'assistant crée la fiche `ouvriers` (avec email obligatoire), et c'est cette action qui déclenche la création du compte — pas l'inverse.

1. Le pasteur/assistant crée un ouvrier avec un email (table `ouvriers`).
2. Une Server Action, **côté serveur uniquement**, appelle `supabase.auth.admin.inviteUserByEmail(email)` avec la clé `service_role`.
3. Supabase envoie l'email avec le lien d'initialisation de mot de passe.
4. Une fois le mot de passe défini, lier `ouvriers.auth_user_id` à l'utilisateur Supabase créé (par email, via un trigger sur `auth.users` ou au moment du callback).

La clé `service_role` ne doit **jamais** être exposée côté client — uniquement dans des Server Actions ou des Route Handlers.

## Règles strictes pour le code généré

- Toute lecture/écriture de données passe par le client Supabase dans un Server Component ou une Server Action, jamais par un appel direct à PostgreSQL.
- Les actions suivantes passent **obligatoirement** par leur fonction RPC dédiée (`rls_policies.sql`), jamais par un `update()` direct sur `affectations` : assigner un rôle secondaire (`rpc_assigner_role`), suspendre (`rpc_suspendre_ouvrier`), réactiver (`rpc_reactiver_ouvrier`), marquer un départ définitif (`rpc_marquer_quitte`).
- Le solde d'un département se lit via `fn_solde_departement()`, jamais en interrogeant directement `mouvements_caisse` pour un rôle membre/trésorier.
- Toute interface est conçue mobile-first (cf. cahier des charges §12) — tester l'affichage à 375px de large avant desktop.
- Langue de l'interface : français.
- Une seule devise (FC), aucune logique multi-devise à prévoir.

## Structure de projet recommandée

```
app/
  (auth)/login/
  (auth)/reset-password/
  mon-espace/                  -- couche 1, tous les utilisateurs
  departements/[id]/
    aujourd-hui/
    rapport/
    caisse/
    equipe/
  pilotage/                    -- couche 3, pasteur/assistant
  ouvriers/                    -- gestion globale, pasteur/assistant
lib/
  supabase/
    client.ts                  -- client navigateur
    server.ts                  -- client serveur (Server Components/Actions)
    admin.ts                   -- client service_role, jamais importe cote client
  validations/                 -- schemas zod par formulaire
components/
  ui/                          -- composants shadcn
```

## Commandes utiles

```bash
npx create-next-app@latest --typescript --tailwind --app
npx shadcn@latest init
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push                          # applique schema.sql + rls_policies.sql
npx supabase gen types typescript --linked > lib/supabase/types.ts
```
