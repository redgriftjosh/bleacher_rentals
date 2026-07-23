-- Driver credential expiration dates (license, insurance, medical card).
-- Used by the driver app for expiry warnings / accept-trip gates,
-- and by the web app for admin / AM notifications.

alter table public."Drivers"
  add column if not exists license_expires_on date null,
  add column if not exists insurance_expires_on date null,
  add column if not exists medical_card_expires_on date null;

comment on column public."Drivers".license_expires_on is
  'Expiration date of the driver''s license. Valid through this calendar day inclusive.';

comment on column public."Drivers".insurance_expires_on is
  'Expiration date of the certificate of insurance. Valid through this calendar day inclusive.';

comment on column public."Drivers".medical_card_expires_on is
  'Expiration date of the medical card (USA). Valid through this calendar day inclusive.';
