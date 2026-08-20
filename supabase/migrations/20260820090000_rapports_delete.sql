-- Suppression d'un rapport soumis : jusqu'ici bloquee par design (aucune
-- policy DELETE, cf. commentaire d'origine "un rapport soumis reste une
-- archive datee"). Ouverte au meme perimetre que la soumission -- pilotage
-- (pasteur/assistant) et gestionnaires du departement (president,
-- vice-president, secretaire) -- pour permettre de retirer un rapport
-- soumis par erreur ou sur la mauvaise periode.

create policy rapports_delete on rapports for delete using (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
);
