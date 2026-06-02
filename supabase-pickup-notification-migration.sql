alter table pengambilan_koin
  add column if not exists status_notifikasi text not null default 'belum_dikirim',
  add column if not exists waktu_notifikasi timestamptz,
  add column if not exists catatan_notifikasi text,
  add column if not exists riwayat_notifikasi jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pengambilan_koin_status_notifikasi_check'
  ) then
    alter table pengambilan_koin
      add constraint pengambilan_koin_status_notifikasi_check
      check (status_notifikasi in ('belum_dikirim', 'terkirim_wa', 'nomor_kosong', 'cetak_bukti', 'konfirmasi_manual'));
  end if;
end $$;

update pengambilan_koin as pickup
set
  status_notifikasi = 'nomor_kosong',
  waktu_notifikasi = coalesce(pickup.waktu_notifikasi, now()),
  catatan_notifikasi = coalesce(pickup.catatan_notifikasi, 'Nomor WhatsApp donatur belum tersedia.'),
  riwayat_notifikasi = case
    when jsonb_array_length(coalesce(pickup.riwayat_notifikasi, '[]'::jsonb)) = 0 then
      jsonb_build_array(jsonb_build_object(
        'status', 'nomor_kosong',
        'timestamp', coalesce(pickup.waktu_notifikasi, now()),
        'note', 'Nomor WhatsApp donatur belum tersedia.'
      ))
    else pickup.riwayat_notifikasi
  end
from donatur
where pickup.donatur_id = donatur.id
  and coalesce(trim(donatur.phone), '') = ''
  and pickup.status_notifikasi = 'belum_dikirim';
