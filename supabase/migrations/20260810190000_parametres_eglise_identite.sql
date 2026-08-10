-- ----------------------------------------------------------------------------
-- Identite de l'eglise pour l'en-tete des documents generes (rapports PDF).
-- adresse/telephone/email existaient deja ; il manquait le nom de l'eglise
-- et, le cas echeant, le nom du reseau/mouvement dont elle fait partie.
-- ----------------------------------------------------------------------------
alter table parametres_eglise
  add column nom_eglise text,
  add column reseau text;
