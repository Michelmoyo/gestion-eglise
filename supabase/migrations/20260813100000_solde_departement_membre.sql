-- Restreint la consultation du solde COURANT de caisse d'un departement
-- (tableau de bord, page caisse) au pilotage, au president, au vice-
-- president et au tresorier (cahier des charges §3.5, §3.7) : ni le
-- secretaire, ni un simple membre ne doivent le voir. Verrouille cote
-- fonction, pas seulement cote UI.
--
-- fn_solde_departement_a_date n'est PAS touchee : elle sert uniquement au
-- calcul interne du rapport mensuel (lib/rapport.ts), soumis notamment par
-- le secretaire -- la restreindre casserait la soumission de rapport pour
-- ce role.

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
  if not (fn_is_pasteur_ou_assistant() or fn_role_departement(p_departement_id) in ('president', 'vice_president', 'tresorier')) then
    raise exception 'Non autorise.';
  end if;

  select coalesce(sum(case when type = 'entree' then montant else -montant end), 0)
    into v_solde
    from mouvements_caisse
    where departement_id = p_departement_id;

  return v_solde;
end;
$$;
