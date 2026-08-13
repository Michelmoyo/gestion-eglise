-- Permet de definir une date de fin lors d'une suspension (ou de laisser la
-- suspension a duree indeterminee, comportement precedent par defaut).

alter table affectations add column if not exists date_fin_suspension date;

create or replace function rpc_suspendre_ouvrier(
  p_affectation_id uuid,
  p_date_fin_suspension date default null
)
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

  if p_date_fin_suspension is not null and p_date_fin_suspension < current_date then
    raise exception 'La date de fin de suspension ne peut pas etre dans le passe.';
  end if;

  update affectations
    set statut = 'suspendu',
        date_changement_statut = current_date,
        date_fin_suspension = p_date_fin_suspension
    where id = p_affectation_id;
end;
$$;

revoke execute on function rpc_suspendre_ouvrier(uuid, date) from public;
grant execute on function rpc_suspendre_ouvrier(uuid, date) to authenticated;

-- L'ancienne signature (sans date de fin) n'existe plus une fois ce script
-- execute -- create or replace ne change pas la signature d'une fonction
-- existante, il faut donc explicitement supprimer l'ancienne.
drop function if exists rpc_suspendre_ouvrier(uuid);

-- Reactivation et depart definitif : on efface la date de fin de suspension,
-- elle n'a plus de sens hors du statut "suspendu".
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
    set statut = 'actif', date_changement_statut = current_date, date_fin_suspension = null
    where id = p_affectation_id;
end;
$$;

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
    set statut = 'quitte', date_changement_statut = current_date, date_fin_suspension = null
    where id = p_affectation_id;
end;
$$;

-- Le tableau de bord/fiche membre a besoin de voir cette date.
create or replace view v_effectifs_departement as
select
  a.id as affectation_id,
  a.departement_id,
  o.id as ouvrier_id,
  o.nom, o.postnom, o.prenom,
  a.role,
  a.statut,
  a.date_affectation,
  a.date_changement_statut,
  a.date_fin_suspension
from affectations a
join ouvriers o on o.id = a.ouvrier_id
where a.statut in ('actif', 'suspendu');
