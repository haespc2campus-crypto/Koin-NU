-- Migrasi QR Code Donatur SIKOINNU
-- Jalankan sekali di Supabase SQL Editor untuk instalasi yang sudah aktif.

alter table donatur add column if not exists kode_donatur text;
alter table donatur add column if not exists qr_code_value text;
alter table donatur add column if not exists qr_code_image text;

update donatur
set kode_donatur = 'DON-' || lpad(coalesce(rt, '0'), 3, '0') || '-' || lpad(coalesce(rw, '0'), 3, '0') || '-' || lpad(id::text, 4, '0')
where kode_donatur is null or kode_donatur = '';

update donatur
set qr_code_value = kode_donatur
where qr_code_value is null or qr_code_value = '';

create unique index if not exists donatur_kode_donatur_unique on donatur (kode_donatur);
