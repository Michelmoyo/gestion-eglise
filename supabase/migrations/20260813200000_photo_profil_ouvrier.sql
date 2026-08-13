-- Permet a chaque ouvrier de definir sa propre photo de profil (bucket
-- public, chemin "<ouvrier_id>/avatar" -- le premier segment sert
-- d'ouvrier_id pour les policies RLS, meme convention que le bucket prive
-- "pieces-jointes").

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_select on storage.objects for select using (
  bucket_id = 'avatars'
);

create policy avatars_insert on storage.objects for insert with check (
  bucket_id = 'avatars'
  and (
    fn_is_pasteur_ou_assistant()
    or (storage.foldername(name))[1] = fn_ouvrier_id_courant()::text
  )
);

create policy avatars_update on storage.objects for update using (
  bucket_id = 'avatars'
  and (
    fn_is_pasteur_ou_assistant()
    or (storage.foldername(name))[1] = fn_ouvrier_id_courant()::text
  )
);

create policy avatars_delete on storage.objects for delete using (
  bucket_id = 'avatars'
  and (
    fn_is_pasteur_ou_assistant()
    or (storage.foldername(name))[1] = fn_ouvrier_id_courant()::text
  )
);

-- La fiche/liste "Equipe" d'un departement affiche aussi la photo de profil.
create or replace view v_effectifs_departement as
select
  a.id as affectation_id,
  a.departement_id,
  o.id as ouvrier_id,
  o.nom, o.postnom, o.prenom,
  o.photo_url,
  a.role,
  a.statut,
  a.date_affectation,
  a.date_changement_statut,
  a.date_fin_suspension
from affectations a
join ouvriers o on o.id = a.ouvrier_id
where a.statut in ('actif', 'suspendu');
