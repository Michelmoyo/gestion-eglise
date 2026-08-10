-- ----------------------------------------------------------------------------
-- FICHE DETAIL D'UN POINT DE SUIVI
-- "contenu" reste le titre court affiche dans la liste. On ajoute une
-- description longue (facultative) et une piece jointe unique (facultative),
-- consultables sur une page dediee (comme une carte Trello/Asana).
-- ----------------------------------------------------------------------------
alter table points_suivi add column description text;
alter table points_suivi add column piece_jointe_path text;
alter table points_suivi add column piece_jointe_nom text;

-- ----------------------------------------------------------------------------
-- STOCKAGE DES PIECES JOINTES
-- Bucket prive : les fichiers ne sont accessibles que via URL signee generee
-- cote serveur (jamais d'URL publique). Convention de chemin :
-- "<departement_id>/<point_suivi_id>-<nom_fichier>" -- le premier segment du
-- chemin sert de departement_id pour les policies RLS ci-dessous.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pieces-jointes', 'pieces-jointes', false)
on conflict (id) do nothing;

create policy pieces_jointes_select on storage.objects for select using (
  bucket_id = 'pieces-jointes'
  and (
    fn_is_pasteur_ou_assistant()
    or fn_est_affecte(((storage.foldername(name))[1])::uuid)
  )
);

create policy pieces_jointes_insert on storage.objects for insert with check (
  bucket_id = 'pieces-jointes'
  and (
    fn_is_pasteur_ou_assistant()
    or fn_gere_departement(((storage.foldername(name))[1])::uuid)
  )
);

create policy pieces_jointes_delete on storage.objects for delete using (
  bucket_id = 'pieces-jointes'
  and (
    fn_is_pasteur_ou_assistant()
    or fn_gere_departement(((storage.foldername(name))[1])::uuid)
  )
);
