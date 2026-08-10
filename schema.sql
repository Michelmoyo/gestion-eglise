-- ============================================================================
-- SCHEMA DE BASE DE DONNEES
-- Application de Gestion des Departements d'Eglise
-- Cible : PostgreSQL 15+ (Supabase)
--
-- Hypotheses :
--   - Une seule eglise (pas de multi-tenant), donc aucune colonne "eglise_id".
--   - Une seule devise pour la caisse (pas de colonne devise sur les montants).
--   - gen_random_uuid() est disponible nativement depuis PostgreSQL 13,
--     aucune extension a activer.
--   - "auth.users" est le schema d'authentification fourni par Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type sexe_enum as enum ('M', 'F');
create type statut_ouvrier_enum as enum ('actif', 'inactif');
create type role_global_enum as enum ('pasteur', 'assistant');
create type role_departement_enum as enum ('membre', 'secretaire', 'tresorier', 'vice_president', 'president');
create type statut_affectation_enum as enum ('actif', 'suspendu', 'quitte');
create type statut_presence_enum as enum ('present', 'absent', 'excuse');
create type type_mouvement_enum as enum ('entree', 'sortie');
create type sante_enum as enum ('vert', 'orange', 'rouge');

-- ----------------------------------------------------------------------------
-- FONCTION GENERIQUE : mise a jour automatique de updated_at
-- ----------------------------------------------------------------------------
create or replace function fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- PARAMETRES EGLISE
-- Ligne unique (pas de eglise_id, une seule eglise -- cf. hypotheses en tete
-- de fichier). Alimente l'entete des documents generes (rapports).
-- Modifiable par le pasteur uniquement, cf. rls_policies.sql.
-- ----------------------------------------------------------------------------
create table parametres_eglise (
  id          uuid primary key default gen_random_uuid(),
  adresse     text,
  telephone   text,
  email       text,
  updated_at  timestamptz not null default now()
);

create trigger trg_parametres_eglise_updated_at
  before update on parametres_eglise
  for each row execute function fn_set_updated_at();

insert into parametres_eglise (adresse, telephone, email) values (null, null, null);

-- ----------------------------------------------------------------------------
-- OUVRIERS
-- Fiche individuelle + lien vers le compte de connexion Supabase Auth.
-- role_global est NULL pour un ouvrier "normal" : ses seuls roles viennent
-- des affectations (president, secretaire, etc. par departement).
-- ----------------------------------------------------------------------------
create table ouvriers (
  id              uuid primary key default gen_random_uuid(),
  auth_user_id    uuid unique references auth.users(id) on delete set null,
  nom             text not null,
  postnom         text,
  prenom          text not null,
  sexe            sexe_enum,
  date_naissance  date,
  telephone       text,
  adresse         text,
  email           text not null unique,
  photo_url       text,
  date_integration date not null default current_date,
  statut          statut_ouvrier_enum not null default 'actif',
  role_global     role_global_enum,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_ouvriers_updated_at
  before update on ouvriers
  for each row execute function fn_set_updated_at();

-- ----------------------------------------------------------------------------
-- DEPARTEMENTS
-- Le president et le vice-president ne sont PAS des colonnes ici :
-- ils sont deduits de affectations.role (une seule source de verite).
-- ----------------------------------------------------------------------------
create table departements (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null unique,
  description   text,
  date_creation date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_departements_updated_at
  before update on departements
  for each row execute function fn_set_updated_at();

-- ----------------------------------------------------------------------------
-- AFFECTATIONS (Ouvrier <-> Departement)
-- Un ouvrier peut etre affecte a plusieurs departements. L'historique est
-- conserve via le statut (actif / suspendu / quitte), jamais par suppression.
-- ----------------------------------------------------------------------------
create table affectations (
  id                     uuid primary key default gen_random_uuid(),
  ouvrier_id             uuid not null references ouvriers(id) on delete cascade,
  departement_id         uuid not null references departements(id) on delete cascade,
  role                   role_departement_enum not null default 'membre',
  statut                 statut_affectation_enum not null default 'actif',
  date_affectation       date not null default current_date,
  date_changement_statut date,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (ouvrier_id, departement_id)
);

create trigger trg_affectations_updated_at
  before update on affectations
  for each row execute function fn_set_updated_at();

create index idx_affectations_ouvrier on affectations(ouvrier_id);
create index idx_affectations_departement on affectations(departement_id);

-- Un seul president actif a la fois par departement.
create unique index idx_un_seul_president_actif on affectations (departement_id)
  where role = 'president' and statut = 'actif';

-- ----------------------------------------------------------------------------
-- ACTIVITES
-- Creation toujours manuelle (pas de recurrence automatique en V1).
-- ----------------------------------------------------------------------------
create table activites (
  id              uuid primary key default gen_random_uuid(),
  departement_id  uuid not null references departements(id) on delete cascade,
  titre           text not null,
  date_activite   date not null,
  heure           time,
  lieu            text,
  description     text,
  responsable_id  uuid references ouvriers(id),
  created_by      uuid references ouvriers(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_activites_updated_at
  before update on activites
  for each row execute function fn_set_updated_at();

create index idx_activites_departement on activites(departement_id);
create index idx_activites_date on activites(date_activite);

-- ----------------------------------------------------------------------------
-- PRESENCES
-- ----------------------------------------------------------------------------
create table presences (
  id            uuid primary key default gen_random_uuid(),
  activite_id   uuid not null references activites(id) on delete cascade,
  ouvrier_id    uuid not null references ouvriers(id) on delete cascade,
  statut        statut_presence_enum not null,
  justification text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (activite_id, ouvrier_id)
);

create trigger trg_presences_updated_at
  before update on presences
  for each row execute function fn_set_updated_at();

create index idx_presences_activite on presences(activite_id);
create index idx_presences_ouvrier on presences(ouvrier_id);

-- ----------------------------------------------------------------------------
-- CULTES
-- Evenements a l'echelle de l'eglise (culte dominical, intercession, nuit de
-- priere, retraite, formation...), distincts des activites de departement
-- (cf. cahier des charges S4.5 et S5). "type" est en texte libre : le pasteur
-- peut ajouter un nouveau type de rassemblement sans migration.
-- Creation et saisie des presences reservees pasteur/assistant (rls_policies.sql).
-- ----------------------------------------------------------------------------
create table cultes (
  id           uuid primary key default gen_random_uuid(),
  type         text not null,
  date_culte   date not null,
  heure        time,
  lieu         text,
  description  text,
  created_by   uuid not null references ouvriers(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_cultes_updated_at
  before update on cultes
  for each row execute function fn_set_updated_at();

create index idx_cultes_date on cultes(date_culte);

-- Presence nominative au culte. Contrairement a "presences" (departement,
-- petit effectif, visible de tous les membres), l'assemblee peut compter des
-- centaines de personnes : un ouvrier ne voit que sa propre ligne (voir RLS).
create table presences_culte (
  id           uuid primary key default gen_random_uuid(),
  culte_id     uuid not null references cultes(id) on delete cascade,
  ouvrier_id   uuid not null references ouvriers(id) on delete cascade,
  statut       statut_presence_enum not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (culte_id, ouvrier_id)
);

create trigger trg_presences_culte_updated_at
  before update on presences_culte
  for each row execute function fn_set_updated_at();

create index idx_presences_culte_culte on presences_culte(culte_id);
create index idx_presences_culte_ouvrier on presences_culte(ouvrier_id);

-- ----------------------------------------------------------------------------
-- MOUVEMENTS DE CAISSE
-- Aucune mise a jour ni suppression autorisee (voir rls_policies.sql) :
-- une correction se fait par un mouvement inverse, jamais en editant l'historique.
-- ----------------------------------------------------------------------------
create table mouvements_caisse (
  id              uuid primary key default gen_random_uuid(),
  departement_id  uuid not null references departements(id) on delete cascade,
  type            type_mouvement_enum not null,
  montant         numeric(12,2) not null check (montant > 0),
  motif           text,
  date_mouvement  date not null default current_date,
  auteur_id       uuid not null references ouvriers(id),
  created_at      timestamptz not null default now(),
  constraint motif_obligatoire_si_sortie check (type <> 'sortie' or motif is not null)
);

create index idx_caisse_departement on mouvements_caisse(departement_id);

-- ----------------------------------------------------------------------------
-- LISTES DE SUIVI + POINTS DE SUIVI
-- Inspire d'un outil de gestion de projet (colonnes/listes type Trello),
-- plutot que d'un type fige. Un departement demarre avec 3 listes par defaut
-- (Difficultes, Besoins, Objectifs -- seedees automatiquement a la creation
-- du departement, cf. fn_seed_listes_suivi plus bas), mais le responsable
-- peut en ajouter d'autres a l'avenir (ex. "Risques", "Projets"...).
-- Un point de suivi vit independamment du cycle mensuel du rapport, peut
-- rester ouvert plusieurs mois, et se coche comme resolu par le responsable
-- du departement (president, vice-president, secretaire, ou pasteur/
-- assistant). Visible en permanence sur la page du departement, pas
-- seulement dans un rapport genere.
-- ----------------------------------------------------------------------------
create table listes_suivi (
  id             uuid primary key default gen_random_uuid(),
  departement_id uuid not null references departements(id) on delete cascade,
  nom            text not null,
  ordre          int not null default 0,
  cree_par       uuid references ouvriers(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (departement_id, nom)
);

create trigger trg_listes_suivi_updated_at
  before update on listes_suivi
  for each row execute function fn_set_updated_at();

create index idx_listes_suivi_departement on listes_suivi(departement_id);

create table points_suivi (
  id                 uuid primary key default gen_random_uuid(),
  departement_id     uuid not null references departements(id) on delete cascade,
  liste_id           uuid not null references listes_suivi(id) on delete cascade,
  contenu            text not null, -- titre court, affiche dans la liste
  description        text,          -- description longue, fiche detail uniquement
  piece_jointe_path  text,          -- chemin dans le bucket storage "pieces-jointes"
  piece_jointe_nom   text,          -- nom de fichier original, pour l'affichage
  resolu             boolean not null default false,
  date_creation      date not null default current_date,
  date_resolution    date,
  cree_par           uuid not null references ouvriers(id),
  resolu_par         uuid references ouvriers(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger trg_points_suivi_updated_at
  before update on points_suivi
  for each row execute function fn_set_updated_at();

create index idx_points_suivi_departement on points_suivi(departement_id);

-- ----------------------------------------------------------------------------
-- STOCKAGE DES PIECES JOINTES (fiche detail d'un point de suivi)
-- Bucket prive : fichiers accessibles uniquement via URL signee generee cote
-- serveur. Chemin "<departement_id>/<point_suivi_id>-<nom_fichier>" -- le
-- premier segment sert de departement_id pour les policies RLS.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pieces-jointes', 'pieces-jointes', false)
on conflict (id) do nothing;
create index idx_points_suivi_liste on points_suivi(liste_id);

-- Nouveau departement : seed automatique des 3 listes par defaut.
create or replace function fn_seed_listes_suivi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into listes_suivi (departement_id, nom, ordre) values
    (new.id, 'Difficultés', 0),
    (new.id, 'Besoins', 1),
    (new.id, 'Objectifs', 2);
  return new;
end;
$$;

drop trigger if exists trg_seed_listes_suivi on departements;
create trigger trg_seed_listes_suivi
  after insert on departements
  for each row execute function fn_seed_listes_suivi();

-- ----------------------------------------------------------------------------
-- RAPPORTS
-- La partie quantitative (effectifs, activites, caisse) n'est PAS dupliquee
-- ici : elle se calcule via les vues ci-dessous, filtrees sur "periode".
-- difficultes/besoins/objectifs sont desormais une COPIE figee, prise depuis
-- points_suivi au moment de la soumission (voir soumettrerapport) -- plus de
-- saisie manuelle a chaque rapport. Aucune mise a jour libre par ailleurs :
-- un rapport soumis reste une archive datee.
-- ----------------------------------------------------------------------------
create table rapports (
  id              uuid primary key default gen_random_uuid(),
  departement_id  uuid references departements(id) on delete cascade,
  periode         date not null, -- premier jour du mois couvert
  difficultes     text,
  besoins         text,
  objectifs       text,
  auteur_id       uuid not null references ouvriers(id),
  date_soumission timestamptz not null default now(),
  unique (departement_id, periode)
);

create index idx_rapports_departement on rapports(departement_id);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS (in-app uniquement en V1)
-- ----------------------------------------------------------------------------
create table notifications (
  id             uuid primary key default gen_random_uuid(),
  destinataire_id uuid not null references ouvriers(id) on delete cascade,
  type           text not null,
  contenu        text not null,
  lue            boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trg_notifications_updated_at
  before update on notifications
  for each row execute function fn_set_updated_at();

create index idx_notifications_destinataire on notifications(destinataire_id);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS AUTOMATIQUES (US7.1, US7.4 du backlog)
-- "notifications" n'a pas de policy INSERT (voir rls_policies.sql) : seul le
-- backend peut y ecrire. On le fait ici via des triggers SECURITY DEFINER,
-- au meme titre que les fonctions rpc_* plus bas.
-- Les rappels avant activite (US7.2) et le rapport en retard (US7.3) ne sont
-- PAS couverts ici : ils dependent du temps qui passe, pas d'un insert, et
-- necessitent donc un job planifie plutot qu'un trigger.
-- ----------------------------------------------------------------------------
create or replace function fn_notifier_nouvelle_affectation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom_departement text;
begin
  select nom into v_nom_departement from departements where id = new.departement_id;

  insert into notifications (destinataire_id, type, contenu)
  values (
    new.ouvrier_id,
    'nouvelle_affectation',
    'Vous avez été affecté au département ' || coalesce(v_nom_departement, '')
  );

  return new;
end;
$$;

drop trigger if exists trg_notifier_nouvelle_affectation on affectations;
create trigger trg_notifier_nouvelle_affectation
  after insert on affectations
  for each row execute function fn_notifier_nouvelle_affectation();

create or replace function fn_notifier_nouvelle_activite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom_departement text;
begin
  select nom into v_nom_departement from departements where id = new.departement_id;

  insert into notifications (destinataire_id, type, contenu)
  select
    a.ouvrier_id,
    'nouvelle_activite',
    'Nouvelle activité "' || new.titre || '" le ' || to_char(new.date_activite, 'DD/MM/YYYY')
      || ' — ' || coalesce(v_nom_departement, '')
  from affectations a
  where a.departement_id = new.departement_id
    and a.statut = 'actif';

  return new;
end;
$$;

drop trigger if exists trg_notifier_nouvelle_activite on activites;
create trigger trg_notifier_nouvelle_activite
  after insert on activites
  for each row execute function fn_notifier_nouvelle_activite();

-- Rapport soumis (insert) ou resoumis ce mois-ci (update, cf. upsert dans
-- l'action) : notifie tout le pilotage (pasteur + assistants), pas un
-- destinataire fixe -- il peut y en avoir plusieurs.
create or replace function fn_notifier_rapport_soumis()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom_departement text;
begin
  select nom into v_nom_departement from departements where id = new.departement_id;

  insert into notifications (destinataire_id, type, contenu)
  select
    o.id,
    'rapport_soumis',
    'Rapport soumis pour ' || coalesce(v_nom_departement, '')
      || ' (période du ' || to_char(new.periode, 'DD/MM/YYYY') || ')'
  from ouvriers o
  where o.role_global in ('pasteur', 'assistant');

  return new;
end;
$$;

drop trigger if exists trg_notifier_rapport_soumis on rapports;
create trigger trg_notifier_rapport_soumis
  after insert or update on rapports
  for each row execute function fn_notifier_rapport_soumis();

-- ============================================================================
-- VUES DE CALCUL
-- Alimentent a la fois le tableau de bord (toujours visible) et le rapport
-- mensuel (filtre sur une periode) -- meme logique, deux usages.
-- ============================================================================

-- Effectifs nommes d'un departement (actifs + suspendus), pour le tableau
-- de bord membre/tresorier et pour la section "mouvements d'effectifs" du rapport.
create view v_effectifs_departement as
select
  a.id as affectation_id,
  a.departement_id,
  o.id as ouvrier_id,
  o.nom, o.postnom, o.prenom,
  a.role,
  a.statut,
  a.date_affectation,
  a.date_changement_statut
from affectations a
join ouvriers o on o.id = a.ouvrier_id
where a.statut in ('actif', 'suspendu');

-- Taux de presence par activite (utilise dans le rapport mensuel detaille).
create view v_taux_presence_activite as
select
  activite_id,
  count(*) filter (where statut = 'present') as nb_presents,
  count(*) as nb_total,
  round(100.0 * count(*) filter (where statut = 'present') / nullif(count(*), 0), 1) as taux_presence
from presences
group by activite_id;

-- Taux de presence par culte (indicateurs globaux, cahier des charges S5).
create view v_taux_presence_culte as
select
  culte_id,
  count(*) filter (where statut = 'present') as nb_presents,
  count(*) as nb_total,
  round(100.0 * count(*) filter (where statut = 'present') / nullif(count(*), 0), 1) as taux_presence
from presences_culte
group by culte_id;

-- Taux de presence d'un departement sur les 30 derniers jours
-- (fenetre glissante utilisee par l'algorithme de sante, cahier des charges S6).
create view v_taux_presence_departement_30j as
select
  act.departement_id,
  round(100.0 * count(*) filter (where p.statut = 'present') / nullif(count(*), 0), 1) as taux_presence
from activites act
join presences p on p.activite_id = act.id
where act.date_activite >= current_date - interval '30 days'
group by act.departement_id;

-- Meme taux, mais pour la fenetre des 30 jours PRECEDENTS (pour detecter une baisse).
create view v_taux_presence_departement_30j_precedent as
select
  act.departement_id,
  round(100.0 * count(*) filter (where p.statut = 'present') / nullif(count(*), 0), 1) as taux_presence
from activites act
join presences p on p.activite_id = act.id
where act.date_activite >= current_date - interval '60 days'
  and act.date_activite <  current_date - interval '30 days'
group by act.departement_id;

-- ----------------------------------------------------------------------------
-- ALGORITHME DE SANTE DES DEPARTEMENTS (cahier des charges S6)
-- NB : la regle "un meme ouvrier absent a 3 activites consecutives" n'est PAS
-- incluse ici -- elle demande une fenetre glissante par ouvrier (fonction
-- window) plus couteuse a exprimer simplement. A ajouter dans un second temps
-- si l'usage montre qu'elle manque vraiment.
-- ----------------------------------------------------------------------------
create or replace function fn_sante_departement(p_departement_id uuid)
returns sante_enum
language plpgsql
stable
as $$
declare
  v_derniere_activite date;
  v_taux_presence numeric;
  v_taux_presence_precedent numeric;
  v_dernier_rapport date;
  v_derniere_action_responsable date;
begin
  select max(date_activite) into v_derniere_activite
  from activites where departement_id = p_departement_id;

  select taux_presence into v_taux_presence
  from v_taux_presence_departement_30j where departement_id = p_departement_id;

  select taux_presence into v_taux_presence_precedent
  from v_taux_presence_departement_30j_precedent where departement_id = p_departement_id;

  select max(periode) into v_dernier_rapport
  from rapports where departement_id = p_departement_id;

  select max(act.date_activite) into v_derniere_action_responsable
  from activites act
  where act.departement_id = p_departement_id
    and act.created_by in (
      select ouvrier_id from affectations
      where departement_id = p_departement_id
        and role in ('president', 'vice_president')
        and statut = 'actif'
    );

  -- ROUGE
  if v_derniere_activite is null
     or v_derniere_activite < current_date - interval '30 days'
     or coalesce(v_taux_presence, 0) < 50
     or v_dernier_rapport is null
     or v_dernier_rapport < current_date - interval '60 days'
     or v_derniere_action_responsable is null
     or v_derniere_action_responsable < current_date - interval '30 days'
  then
    return 'rouge';
  end if;

  -- ORANGE
  if v_taux_presence between 50 and 70
     or (v_taux_presence_precedent is not null and v_taux_presence_precedent - v_taux_presence > 15)
     or v_dernier_rapport < current_date - interval '30 days'
  then
    return 'orange';
  end if;

  return 'vert';
end;
$$;
