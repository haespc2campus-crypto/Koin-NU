-- SIKOINNU PostgreSQL relational table-per-entity migration

create table if not exists koin_profiles (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists koin_ranting_profile (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_pengurus (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_petugas (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_donatur (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_pengambilan_koin (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_verifikasi_setoran (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_setoran_petugas (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_setoran_lazisnu (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_penyaluran_dana (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_dokumentasi_kegiatan (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_berita (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_settings (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create index if not exists koin_profiles_email_idx on koin_profiles ((lower(data->>'email')));
create index if not exists koin_donatur_petugas_idx on koin_donatur ((data->>'petugas_id'));
create index if not exists koin_pengambilan_donatur_idx on koin_pengambilan_koin ((data->>'donatur_id'));
create index if not exists koin_berita_status_idx on koin_berita ((data->>'status'));
