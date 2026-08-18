-- Logo de l'eglise, affiche dans l'en-tete des rapports (document
-- imprimable). Bucket public : une seule eglise, pas de portee a
-- restreindre par dossier comme "avatars" ou "pieces-jointes".

alter table parametres_eglise add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('logo-eglise', 'logo-eglise', true)
on conflict (id) do nothing;

drop policy if exists logo_eglise_select on storage.objects;
create policy logo_eglise_select on storage.objects for select using (
  bucket_id = 'logo-eglise'
);

drop policy if exists logo_eglise_insert on storage.objects;
create policy logo_eglise_insert on storage.objects for insert with check (
  bucket_id = 'logo-eglise' and fn_is_pasteur()
);

drop policy if exists logo_eglise_update on storage.objects;
create policy logo_eglise_update on storage.objects for update using (
  bucket_id = 'logo-eglise' and fn_is_pasteur()
);

drop policy if exists logo_eglise_delete on storage.objects;
create policy logo_eglise_delete on storage.objects for delete using (
  bucket_id = 'logo-eglise' and fn_is_pasteur()
);
