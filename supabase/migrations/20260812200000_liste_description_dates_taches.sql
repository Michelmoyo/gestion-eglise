-- ----------------------------------------------------------------------------
-- Chaque liste a desormais sa propre page (l'accordeon depliait beaucoup
-- trop d'informations d'un coup) : elle peut donc porter une description,
-- comme les taches en ont deja une.
--
-- Les taches gagnent des dates de debut/fin (planification, style Asana),
-- distinctes de date_creation (auto) et date_resolution (auto a la
-- cloture) qui restent des horodatages, pas des champs de planification.
-- ----------------------------------------------------------------------------
alter table listes_suivi
  add column description text;

alter table points_suivi
  add column date_debut date,
  add column date_fin date;
