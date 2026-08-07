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

-- IMPORTANT : toutes les fonctions utilitaires doivent etre SECURITY DEFINER.
-- Sans cela, elles sont soumises aux policies RLS de la table qu'elles interrogent,
-- ce qui cree une recursion infinie (policy → fonction → policy → ...) et
-- PostgreSQL retourne un ensemble vide, rendant toutes les requetes normales nulles.

create or replace function fn_ouvrier_id_courant()
returns uuid language sql stable security definer
set search_path = public
as $$
  select id from ouvriers where auth_user_id = auth.uid()
$$;

create or replace function fn_is_pasteur()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from ouvriers where auth_user_id = auth.uid() and role_global = 'pasteur'
  )
$$;

create or replace function fn_is_pasteur_ou_assistant()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from ouvriers where auth_user_id = auth.uid() and role_global in ('pasteur', 'assistant')
  )
$$;

-- Role de l'utilisateur courant dans un departement donne (NULL si non affecte).
create or replace function fn_role_departement(p_departement_id uuid)
returns role_departement_enum language sql stable security definer
set search_path = public
as $$
  select role from affectations
  where departement_id = p_departement_id
    and ouvrier_id = fn_ouvrier_id_courant()
    and statut = 'actif'
  limit 1
$$;

-- L'utilisateur courant est-il affecte (actif ou suspendu) a ce departement ?
create or replace function fn_est_affecte(p_departement_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from affectations
    where departement_id = p_departement_id
      and ouvrier_id = fn_ouvrier_id_courant()
      and statut in ('actif', 'suspendu')
  )
$$;

-- L'utilisateur courant gere-t-il ce departement (president, vice-president, secretaire) ?
create or replace function fn_gere_departement(p_departement_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
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
-- CULTES
-- Evenement d'eglise (pas confidentiel) : visible par tout utilisateur
-- connecte. Creation/modification/suppression reservees pasteur/assistant --
-- un culte n'appartient a aucun departement, donc pas de fn_gere_departement
-- possible ici.
-- ----------------------------------------------------------------------------
alter table cultes enable row level security;

create policy cultes_select on cultes for select using (
  auth.uid() is not null
);

create policy cultes_insert on cultes for insert with check (
  fn_is_pasteur_ou_assistant()
);

create policy cultes_update on cultes for update using (
  fn_is_pasteur_ou_assistant()
) with check (
  fn_is_pasteur_ou_assistant()
);

create policy cultes_delete on cultes for delete using (
  fn_is_pasteur_ou_assistant()
);

-- ----------------------------------------------------------------------------
-- PRESENCES CULTE
-- A la difference de "presences" (departement, petit effectif, visible par
-- toute l'equipe), l'assemblee peut compter des centaines de personnes : un
-- ouvrier ne voit que sa propre ligne, jamais celle des autres. Saisie
-- reservee pasteur/assistant (decision produit -- pas de delegation en V1).
-- ----------------------------------------------------------------------------
alter table presences_culte enable row level security;

create policy presences_culte_select on presences_culte for select using (
  fn_is_pasteur_ou_assistant() or ouvrier_id = fn_ouvrier_id_courant()
);

create policy presences_culte_insert on presences_culte for insert with check (
  fn_is_pasteur_ou_assistant()
);

create policy presences_culte_update on presences_culte for update using (
  fn_is_pasteur_ou_assistant()
) with check (
  fn_is_pasteur_ou_assistant()
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
