-- ----------------------------------------------------------------------------
-- COMMENTAIRES SUR UN POINT DE SUIVI
-- Fil de discussion sur la fiche detail (comme un commentaire de carte
-- Trello/Asana). Ouvert a tout membre affecte au departement, pas seulement
-- aux gestionnaires -- un commentaire est collaboratif, pas une action de
-- gestion. Immuable une fois poste (pas de policy UPDATE) ; suppression
-- reservee a l'auteur ou aux gestionnaires du departement.
-- ----------------------------------------------------------------------------
create table commentaires_suivi (
  id             uuid primary key default gen_random_uuid(),
  point_suivi_id uuid not null references points_suivi(id) on delete cascade,
  departement_id uuid not null references departements(id) on delete cascade,
  auteur_id      uuid not null references ouvriers(id),
  contenu        text not null,
  created_at     timestamptz not null default now()
);

create index idx_commentaires_suivi_point on commentaires_suivi(point_suivi_id);

alter table commentaires_suivi enable row level security;

create policy commentaires_suivi_select on commentaires_suivi for select using (
  fn_is_pasteur_ou_assistant() or fn_est_affecte(departement_id)
);

create policy commentaires_suivi_insert on commentaires_suivi for insert with check (
  fn_is_pasteur_ou_assistant() or fn_est_affecte(departement_id)
);

create policy commentaires_suivi_delete on commentaires_suivi for delete using (
  fn_is_pasteur_ou_assistant()
  or auteur_id = fn_ouvrier_id_courant()
  or fn_gere_departement(departement_id)
);
