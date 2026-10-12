-- Deux ecarts trouves pendant la recette fonctionnelle de la caisse/equipe,
-- par rapport a la matrice de permissions du cahier des charges (§3.8) :
--
-- 1. rpc_assigner_role autorisait l'assistant (via fn_is_pasteur_ou_assistant)
--    a assigner un role secondaire et a nommer un president -- alors que la
--    matrice reserve ces deux actions au pasteur (et au president pour la
--    premiere). Le message d'erreur de la fonction disait deja "reservee au
--    pasteur" sans que le code ne l'impose reellement.
--
-- 2. fn_solde_departement_a_date n'etait restreinte qu'a "un affecte
--    quelconque" (fn_est_affecte), donc accessible a un simple membre par
--    appel RPC direct, contournant la regle "membre ✗ voir les statistiques
--    de son departement". On la resserre a pilotage/president/vice-
--    president/secretaire/tresorier -- le secretaire est garde car le
--    rapport mensuel qu'il soumet a besoin de ce chiffre (cf. commit
--    eb8a425 qui avait deliberement laisse cette fonction de cote pour ne
--    pas casser cette soumission).

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

  if not (fn_is_pasteur() or fn_role_departement(v_departement_id) = 'president') then
    raise exception 'Seul le president de ce departement (ou le pasteur) peut assigner un role.';
  end if;

  if p_nouveau_role = 'president' and not fn_is_pasteur() then
    raise exception 'La nomination d''un president est reservee au pasteur.';
  end if;

  update affectations
    set role = p_nouveau_role
    where id = p_affectation_id;
end;
$$;

create or replace function fn_solde_departement_a_date(p_departement_id uuid, p_date date)
returns numeric
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_solde numeric;
begin
  if not (
    fn_is_pasteur_ou_assistant()
    or fn_role_departement(p_departement_id) in ('president', 'vice_president', 'secretaire', 'tresorier')
  ) then
    raise exception 'Non autorise.';
  end if;

  select coalesce(sum(case when type = 'entree' then montant else -montant end), 0)
    into v_solde
    from mouvements_caisse
    where departement_id = p_departement_id
      and date_mouvement <= p_date;

  return v_solde;
end;
$$;
