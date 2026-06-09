-- =============================================================
-- Backfill pricing matrix for production
-- BleacherTypes, EventTypes, PriceDurations, Prices
-- Based on 2026 rate card
-- =============================================================

DO $$
DECLARE
  -- BleacherTypes
  bt_15row uuid;
  bt_10row uuid;
  bt_7row  uuid;
  bt_4row uuid;


  -- EventTypes
  et_rural     uuid;
  et_city      uuid;
  et_corporate uuid;

  -- PriceDurations
  pd_1day    uuid;
  pd_3day    uuid;
  pd_1week   uuid;
  pd_2week   uuid;
  pd_monthly uuid;
BEGIN
  -- =====================
  -- BleacherTypes
  -- =====================
  INSERT INTO public."BleacherTypes" (id, name, row_count) VALUES
    (gen_random_uuid(), '15-Row, 450 Seat',            15),
    (gen_random_uuid(), '10-Row, 300 Seat',            10),
    (gen_random_uuid(), '7-Row, 100/150 Seat',          7),
    (gen_random_uuid(), '4-Row, 20 Seat',               4);

  SELECT id INTO bt_15row     FROM public."BleacherTypes" WHERE name = '15-Row, 450 Seat';
  SELECT id INTO bt_10row     FROM public."BleacherTypes" WHERE name = '10-Row, 300 Seat';
  SELECT id INTO bt_7row      FROM public."BleacherTypes" WHERE name = '7-Row, 100/150 Seat';
  SELECT id INTO bt_4row      FROM public."BleacherTypes" WHERE name = '4-Row, 20 Seat';

  -- =====================
  -- EventTypes
  -- =====================
  INSERT INTO public."EventTypes" (id, name) VALUES
    (gen_random_uuid(), 'Rural'),
    (gen_random_uuid(), 'City'),
    (gen_random_uuid(), 'Corporate');

  SELECT id INTO et_rural     FROM public."EventTypes" WHERE name = 'Rural';
  SELECT id INTO et_city      FROM public."EventTypes" WHERE name = 'City';
  SELECT id INTO et_corporate FROM public."EventTypes" WHERE name = 'Corporate';

  -- =====================
  -- PriceDurations
  -- =====================
  INSERT INTO public."PriceDurations" (id, name, min_days, max_days) VALUES
    (gen_random_uuid(), '1 Day Rental',    1,  2),
    (gen_random_uuid(), '3 Day Rental',    3,  6),
    (gen_random_uuid(), '1 Week Rental',   7,  12),
    (gen_random_uuid(), '2 Week Rental',   13, 21),
    (gen_random_uuid(), 'Monthly Rental',  22, 35);

  SELECT id INTO pd_1day    FROM public."PriceDurations" WHERE name = '1 Day Rental';
  SELECT id INTO pd_3day    FROM public."PriceDurations" WHERE name = '3 Day Rental';
  SELECT id INTO pd_1week   FROM public."PriceDurations" WHERE name = '1 Week Rental';
  SELECT id INTO pd_2week   FROM public."PriceDurations" WHERE name = '2 Week Rental';
  SELECT id INTO pd_monthly FROM public."PriceDurations" WHERE name = 'Monthly Rental';

  -- =====================
  -- Prices (all in cents)
  -- =====================

  -- 15-Row, 450 Seat — Rural
  INSERT INTO public."Prices" (price_duration_uuid, bleacher_type_uuid, event_type_uuid, price_cents, currency) VALUES
    (pd_1day,    bt_15row, et_rural, 220000, 'USD'),
    (pd_3day,    bt_15row, et_rural, 240000, 'USD'),
    (pd_1week,   bt_15row, et_rural, 260000, 'USD'),
    (pd_2week,   bt_15row, et_rural, 370000, 'USD'),
    (pd_monthly, bt_15row, et_rural, 530000, 'USD');

  -- 15-Row, 450 Seat — City
  INSERT INTO public."Prices" (price_duration_uuid, bleacher_type_uuid, event_type_uuid, price_cents, currency) VALUES
    (pd_1day,    bt_15row, et_city, 290000, 'USD'),
    (pd_3day,    bt_15row, et_city, 320000, 'USD'),
    (pd_1week,   bt_15row, et_city, 350000, 'USD'),
    (pd_2week,   bt_15row, et_city, 480000, 'USD'),
    (pd_monthly, bt_15row, et_city, 700000, 'USD');

  -- 15-Row, 450 Seat — Corporate
  INSERT INTO public."Prices" (price_duration_uuid, bleacher_type_uuid, event_type_uuid, price_cents, currency) VALUES
    (pd_1day,    bt_15row, et_corporate, 350000, 'USD'),
    (pd_3day,    bt_15row, et_corporate, 380000, 'USD'),
    (pd_1week,   bt_15row, et_corporate, 410000, 'USD'),
    (pd_2week,   bt_15row, et_corporate, 620000, 'USD'),
    (pd_monthly, bt_15row, et_corporate, 820000, 'USD');

  -- 10-Row, 300 Seat — Rural
  INSERT INTO public."Prices" (price_duration_uuid, bleacher_type_uuid, event_type_uuid, price_cents, currency) VALUES
    (pd_1day,    bt_10row, et_rural, 125000, 'USD'),
    (pd_3day,    bt_10row, et_rural, 145000, 'USD'),
    (pd_1week,   bt_10row, et_rural, 165000, 'USD'),
    (pd_2week,   bt_10row, et_rural, 250000, 'USD'),
    (pd_monthly, bt_10row, et_rural, 340000, 'USD');

  -- 10-Row, 300 Seat — City
  INSERT INTO public."Prices" (price_duration_uuid, bleacher_type_uuid, event_type_uuid, price_cents, currency) VALUES
    (pd_1day,    bt_10row, et_city, 160000, 'USD'),
    (pd_3day,    bt_10row, et_city, 185000, 'USD'),
    (pd_1week,   bt_10row, et_city, 210000, 'USD'),
    (pd_2week,   bt_10row, et_city, 320000, 'USD'),
    (pd_monthly, bt_10row, et_city, 440000, 'USD');

  -- 10-Row, 300 Seat — Corporate
  INSERT INTO public."Prices" (price_duration_uuid, bleacher_type_uuid, event_type_uuid, price_cents, currency) VALUES
    (pd_1day,    bt_10row, et_corporate, 180000, 'USD'),
    (pd_3day,    bt_10row, et_corporate, 210000, 'USD'),
    (pd_1week,   bt_10row, et_corporate, 340000, 'USD'),
    (pd_2week,   bt_10row, et_corporate, 360000, 'USD'),
    (pd_monthly, bt_10row, et_corporate, 500000, 'USD');

  -- 7-Row, 100/150 Seat — Rural
  INSERT INTO public."Prices" (price_duration_uuid, bleacher_type_uuid, event_type_uuid, price_cents, currency) VALUES
    (pd_1day,    bt_7row, et_rural,  95000, 'USD'),
    (pd_3day,    bt_7row, et_rural, 110000, 'USD'),
    (pd_1week,   bt_7row, et_rural, 125000, 'USD'),
    (pd_2week,   bt_7row, et_rural, 190000, 'USD'),
    (pd_monthly, bt_7row, et_rural, 260000, 'USD');

  -- 7-Row, 100/150 Seat — City
  INSERT INTO public."Prices" (price_duration_uuid, bleacher_type_uuid, event_type_uuid, price_cents, currency) VALUES
    (pd_1day,    bt_7row, et_city, 125000, 'USD'),
    (pd_3day,    bt_7row, et_city, 145000, 'USD'),
    (pd_1week,   bt_7row, et_city, 170000, 'USD'),
    (pd_2week,   bt_7row, et_city, 250000, 'USD'),
    (pd_monthly, bt_7row, et_city, 340000, 'USD');

  -- 7-Row, 100/150 Seat — Corporate
  INSERT INTO public."Prices" (price_duration_uuid, bleacher_type_uuid, event_type_uuid, price_cents, currency) VALUES
    (pd_1day,    bt_7row, et_corporate, 150000, 'USD'),
    (pd_3day,    bt_7row, et_corporate, 180000, 'USD'),
    (pd_1week,   bt_7row, et_corporate, 210000, 'USD'),
    (pd_2week,   bt_7row, et_corporate, 310000, 'USD'),
    (pd_monthly, bt_7row, et_corporate, 420000, 'USD');

  -- 4-Row, 20 Seat — Rural
  INSERT INTO public."Prices" (price_duration_uuid, bleacher_type_uuid, event_type_uuid, price_cents, currency) VALUES
    (pd_1day,    bt_4row, et_rural,     30000, 'USD'),
    (pd_3day,    bt_4row, et_rural,     30000, 'USD'),
    (pd_1week,   bt_4row, et_rural,     40000, 'USD'),
    (pd_2week,   bt_4row, et_rural,     50000, 'USD'),
    (pd_monthly, bt_4row, et_rural,     60000, 'USD');

  -- 4-Row, 20 Seat — City
  INSERT INTO public."Prices" (price_duration_uuid, bleacher_type_uuid, event_type_uuid, price_cents, currency) VALUES
    (pd_1day,    bt_4row, et_city,      35000, 'USD'),
    (pd_3day,    bt_4row, et_city,      35000, 'USD'),
    (pd_1week,   bt_4row, et_city,      45000, 'USD'),
    (pd_2week,   bt_4row, et_city,      55000, 'USD'),
    (pd_monthly, bt_4row, et_city,      65000, 'USD');

  -- 4-Row, 20 Seat — Corporate
  INSERT INTO public."Prices" (price_duration_uuid, bleacher_type_uuid, event_type_uuid, price_cents, currency) VALUES
    (pd_1day,    bt_4row, et_corporate, 40000, 'USD'),
    (pd_3day,    bt_4row, et_corporate, 40000, 'USD'),
    (pd_1week,   bt_4row, et_corporate, 50000, 'USD'),
    (pd_2week,   bt_4row, et_corporate, 60000, 'USD'),
    (pd_monthly, bt_4row, et_corporate, 70000, 'USD');


END $$;
