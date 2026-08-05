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
-- RAPPORTS
-- La partie quantitative (effectifs, activites, caisse) n'est PAS dupliquee
-- ici : elle se calcule via les vues ci-dessous, filtrees sur "periode".
-- Cette table ne porte que la partie qualitative + les metadonnees.
-- Aucune mise a jour autorisee : un rapport soumis reste une archive datee.
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


-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Application de Gestion des Departements d'Eglise
-- A executer apres schema.sql
--
-- Principe general : la matrice de permissions du cahier des charges (S3.8)
-- se traduit directement en policies RLS pour les actions "simples"
-- (lecture, creation d'activite, saisie de presence...).
--
-- Pour les actions plus fines -- ou une meme table autorise des sous-actions
-- avec des droits differents (ex : changer un role secondaire vs. retirer un
-- ouvrier d'un departement, toutes deux des UPDATE sur "affectations") --
-- on expose des fonctions RPC "security definer" plutot qu'un UPDATE direct.
-- Une policy RLS ne sait pas distinguer "quelle colonne" est modifiee ;
-- une fonction, oui.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FONCTIONS UTILITAIRES (utilisees dans les policies ci-dessous)
-- ----------------------------------------------------------------------------

create or replace function fn_ouvrier_id_courant()
returns uuid language sql stable as $$
  select id from ouvriers where auth_user_id = auth.uid()
$$;

create or replace function fn_is_pasteur()
returns boolean language sql stable as $$
  select exists (
    select 1 from ouvriers where auth_user_id = auth.uid() and role_global = 'pasteur'
  )
$$;

create or replace function fn_is_pasteur_ou_assistant()
returns boolean language sql stable as $$
  select exists (
    select 1 from ouvriers where auth_user_id = auth.uid() and role_global in ('pasteur', 'assistant')
  )
$$;

-- Role de l'utilisateur courant dans un departement donne (NULL si non affecte).
create or replace function fn_role_departement(p_departement_id uuid)
returns role_departement_enum language sql stable as $$
  select role from affectations
  where departement_id = p_departement_id
    and ouvrier_id = fn_ouvrier_id_courant()
    and statut = 'actif'
  limit 1
$$;

-- L'utilisateur courant est-il affecte (actif ou suspendu) a ce departement ?
create or replace function fn_est_affecte(p_departement_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from affectations
    where departement_id = p_departement_id
      and ouvrier_id = fn_ouvrier_id_courant()
      and statut in ('actif', 'suspendu')
  )
$$;

-- L'utilisateur courant gere-t-il ce departement (president, vice-president, secretaire) ?
create or replace function fn_gere_departement(p_departement_id uuid)
returns boolean language sql stable as $$
  select fn_role_departement(p_departement_id) in ('president', 'vice_president', 'secretaire')
$$;

-- ----------------------------------------------------------------------------
-- OUVRIERS
-- ----------------------------------------------------------------------------
alter table ouvriers enable row level security;

create policy ouvriers_select on ouvriers for select using (
  fn_is_pasteur_ou_assistant()
  or id = fn_ouvrier_id_courant()
  or exists (
    select 1 from affectations mine
    join affectations theirs on theirs.departement_id = mine.departement_id
    where mine.ouvrier_id = fn_ouvrier_id_courant()
      and mine.role in ('president', 'vice_president', 'secretaire')
      and theirs.ouvrier_id = ouvriers.id
  )
);

create policy ouvriers_insert on ouvriers for insert with check (
  fn_is_pasteur_ou_assistant()
);

create policy ouvriers_update on ouvriers for update using (
  fn_is_pasteur_ou_assistant()
) with check (
  fn_is_pasteur_ou_assistant()
);
-- Pas de policy DELETE : la desactivation passe par UPDATE du champ "statut".

-- ----------------------------------------------------------------------------
-- DEPARTEMENTS
-- ----------------------------------------------------------------------------
alter table departements enable row level security;

create policy departements_select on departements for select using (
  auth.uid() is not null
);

create policy departements_insert on departements for insert with check (
  fn_is_pasteur_ou_assistant()
);

create policy departements_update on departements for update using (
  fn_is_pasteur_ou_assistant()
) with check (
  fn_is_pasteur_ou_assistant()
);

-- ----------------------------------------------------------------------------
-- AFFECTATIONS
-- Seuls le pasteur et l'assistant ont un acces UPDATE direct (creation,
-- depart definitif, changement de departement). Les actions du president
-- (assigner un role secondaire, suspendre, reactiver) passent par les
-- fonctions RPC plus bas, qui valident la regle metier avant d'ecrire.
-- ----------------------------------------------------------------------------
alter table affectations enable row level security;

create policy affectations_select on affectations for select using (
  fn_is_pasteur_ou_assistant()
  or ouvrier_id = fn_ouvrier_id_courant()
  or fn_est_affecte(departement_id)
);

create policy affectations_insert on affectations for insert with check (
  fn_is_pasteur_ou_assistant()
);

create policy affectations_update_pasteur on affectations for update using (
  fn_is_pasteur_ou_assistant()
) with check (
  fn_is_pasteur_ou_assistant()
);

-- ----------------------------------------------------------------------------
-- ACTIVITES
-- ----------------------------------------------------------------------------
alter table activites enable row level security;

create policy activites_select on activites for select using (
  fn_is_pasteur_ou_assistant() or fn_est_affecte(departement_id)
);

create policy activites_insert on activites for insert with check (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
);

create policy activites_update on activites for update using (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
) with check (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
);

-- ----------------------------------------------------------------------------
-- PRESENCES
-- ----------------------------------------------------------------------------
alter table presences enable row level security;

create policy presences_select on presences for select using (
  fn_is_pasteur_ou_assistant()
  or ouvrier_id = fn_ouvrier_id_courant()
  or exists (
    select 1 from activites act
    where act.id = presences.activite_id and fn_gere_departement(act.departement_id)
  )
);

create policy presences_insert on presences for insert with check (
  fn_is_pasteur_ou_assistant()
  or exists (
    select 1 from activites act
    where act.id = presences.activite_id and fn_gere_departement(act.departement_id)
  )
);

create policy presences_update on presences for update using (
  fn_is_pasteur_ou_assistant()
  or exists (
    select 1 from activites act
    where act.id = presences.activite_id and fn_gere_departement(act.departement_id)
  )
) with check (
  fn_is_pasteur_ou_assistant()
  or exists (
    select 1 from activites act
    where act.id = presences.activite_id and fn_gere_departement(act.departement_id)
  )
);

-- ----------------------------------------------------------------------------
-- MOUVEMENTS DE CAISSE
-- Lecture des transactions detaillees reservee aux gestionnaires (president,
-- vice-president, tresorier) -- un membre simple n'obtient que le solde
-- agrege via fn_solde_departement() plus bas, jamais la liste des mouvements.
-- Aucune policy UPDATE/DELETE : un mouvement enregistre est immuable.
-- ----------------------------------------------------------------------------
alter table mouvements_caisse enable row level security;

create policy caisse_select on mouvements_caisse for select using (
  fn_is_pasteur_ou_assistant()
  or fn_role_departement(departement_id) in ('president', 'vice_president', 'tresorier')
);

create policy caisse_insert on mouvements_caisse for insert with check (
  fn_is_pasteur_ou_assistant()
  or fn_role_departement(departement_id) in ('president', 'vice_president', 'tresorier')
);

-- ----------------------------------------------------------------------------
-- RAPPORTS
-- Visible par toute personne affectee au departement (faible sensibilite,
-- utile a toute l'equipe) ; soumission reservee aux gestionnaires.
-- Aucune policy UPDATE : un rapport soumis reste une archive datee.
-- ----------------------------------------------------------------------------
alter table rapports enable row level security;

create policy rapports_select on rapports for select using (
  fn_is_pasteur_ou_assistant() or fn_est_affecte(departement_id)
);

create policy rapports_insert on rapports for insert with check (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
alter table notifications enable row level security;

create policy notifications_select on notifications for select using (
  destinataire_id = fn_ouvrier_id_courant()
);

create policy notifications_update on notifications for update using (
  destinataire_id = fn_ouvrier_id_courant()
) with check (
  destinataire_id = fn_ouvrier_id_courant()
);
-- Pas de policy INSERT : les notifications sont creees par le backend
-- (triggers ou job planifie), pas par les utilisateurs eux-memes.

-- ============================================================================
-- FONCTIONS RPC -- actions metier fines
-- Chacune verifie elle-meme l'autorisation puis ecrit en SECURITY DEFINER,
-- ce qui permet d'autoriser une action precise sans ouvrir tout UPDATE/SELECT
-- sur la table sous-jacente.
-- ============================================================================

-- Le president (de CE departement) assigne un role secondaire a un ouvrier
-- deja affecte. Ne permet jamais de nommer un president (reserve au pasteur).
create or replace function rpc_assigner_role(p_affectation_id uuid, p_nouveau_role role_departement_enum)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_departement_id uuid;
begin
  select departement_id into v_departement_id from affectations where id = p_affectation_id;

  if v_departement_id is null then
    raise exception 'Affectation introuvable.';
  end if;

  if not (fn_is_pasteur_ou_assistant() or fn_role_departement(v_departement_id) = 'president') then
    raise exception 'Seul le president de ce departement (ou le pasteur) peut assigner un role.';
  end if;

  if p_nouveau_role = 'president' and not fn_is_pasteur_ou_assistant() then
    raise exception 'La nomination d''un president est reservee au pasteur.';
  end if;

  update affectations
    set role = p_nouveau_role
    where id = p_affectation_id;
end;
$$;

revoke execute on function rpc_assigner_role(uuid, role_departement_enum) from public;
grant execute on function rpc_assigner_role(uuid, role_departement_enum) to authenticated;

-- Suspension temporaire : pasteur, assistant, ou president de ce departement.
create or replace function rpc_suspendre_ouvrier(p_affectation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_departement_id uuid;
begin
  select departement_id into v_departement_id from affectations where id = p_affectation_id;

  if v_departement_id is null then
    raise exception 'Affectation introuvable.';
  end if;

  if not (fn_is_pasteur_ou_assistant() or fn_role_departement(v_departement_id) = 'president') then
    raise exception 'Non autorise a suspendre cet ouvrier.';
  end if;

  update affectations
    set statut = 'suspendu', date_changement_statut = current_date
    where id = p_affectation_id;
end;
$$;

revoke execute on function rpc_suspendre_ouvrier(uuid) from public;
grant execute on function rpc_suspendre_ouvrier(uuid) to authenticated;

-- Reactivation : memes autorises que la suspension.
create or replace function rpc_reactiver_ouvrier(p_affectation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_departement_id uuid;
begin
  select departement_id into v_departement_id from affectations where id = p_affectation_id;

  if v_departement_id is null then
    raise exception 'Affectation introuvable.';
  end if;

  if not (fn_is_pasteur_ou_assistant() or fn_role_departement(v_departement_id) = 'president') then
    raise exception 'Non autorise a reactiver cet ouvrier.';
  end if;

  update affectations
    set statut = 'actif', date_changement_statut = current_date
    where id = p_affectation_id;
end;
$$;

revoke execute on function rpc_reactiver_ouvrier(uuid) from public;
grant execute on function rpc_reactiver_ouvrier(uuid) to authenticated;

-- Depart definitif : reserve au pasteur et a l'assistant (coherent avec
-- l'interdiction faite au president de retirer un ouvrier de son departement).
create or replace function rpc_marquer_quitte(p_affectation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not fn_is_pasteur_ou_assistant() then
    raise exception 'Seul le pasteur ou un assistant peut marquer un depart definitif.';
  end if;

  update affectations
    set statut = 'quitte', date_changement_statut = current_date
    where id = p_affectation_id;
end;
$$;

revoke execute on function rpc_marquer_quitte(uuid) from public;
grant execute on function rpc_marquer_quitte(uuid) to authenticated;

-- Solde agrege d'un departement, visible par tout membre affecte (y compris
-- simple membre) SANS lui donner acces a la liste detaillee des mouvements.
create or replace function fn_solde_departement(p_departement_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_solde numeric;
begin
  if not (fn_is_pasteur_ou_assistant() or fn_est_affecte(p_departement_id)) then
    raise exception 'Non autorise.';
  end if;

  select coalesce(sum(case when type = 'entree' then montant else -montant end), 0)
    into v_solde
    from mouvements_caisse
    where departement_id = p_departement_id;

  return v_solde;
end;
$$;

revoke execute on function fn_solde_departement(uuid) from public;
grant execute on function fn_solde_departement(uuid) to authenticated;

