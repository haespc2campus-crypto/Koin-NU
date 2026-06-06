-- Portal Layanan Warga NU Karangsalam Kidul II
-- Adds new JSONB-backed tables without changing existing SIKOINNU tables.

create table if not exists koin_pengumuman (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_kegiatan (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_layanan_kematian (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_jadwal_tahlil (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_pengajuan_bantuan (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_masjid_mushola (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_umkm (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_produk_umkm (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_download (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_download_log (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_artikel (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_kontak_masuk (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_program_kerja (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_lpj_kegiatan (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists koin_dokumen_publik (id text primary key, data jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create index if not exists koin_pengumuman_status_idx on koin_pengumuman ((data->>'status'));
create unique index if not exists koin_kegiatan_slug_idx on koin_kegiatan ((lower(data->>'slug')));
create index if not exists koin_kegiatan_status_idx on koin_kegiatan ((data->>'status'));
create index if not exists koin_kegiatan_kategori_idx on koin_kegiatan ((data->>'kategori'));
create index if not exists koin_layanan_kematian_status_idx on koin_layanan_kematian ((data->>'status_publikasi'));
create unique index if not exists koin_umkm_slug_idx on koin_umkm ((lower(data->>'slug')));
create index if not exists koin_umkm_status_idx on koin_umkm ((data->>'status'));
create index if not exists koin_umkm_kategori_idx on koin_umkm ((data->>'kategori'));
create unique index if not exists koin_download_slug_idx on koin_download ((lower(data->>'slug')));
create index if not exists koin_download_status_idx on koin_download ((data->>'status'));
create unique index if not exists koin_artikel_slug_idx on koin_artikel ((lower(data->>'slug')));
create index if not exists koin_artikel_status_idx on koin_artikel ((data->>'status'));
create index if not exists koin_artikel_kategori_idx on koin_artikel ((data->>'kategori'));
