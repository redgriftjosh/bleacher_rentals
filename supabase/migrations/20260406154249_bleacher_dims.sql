ALTER TABLE public."Bleachers"
    ADD COLUMN trailer_length_in NUMERIC,
    ADD COLUMN trailer_height_in NUMERIC;

UPDATE public."Bleachers"
SET trailer_length_in = trailer_length * 12
WHERE trailer_length IS NOT NULL;

UPDATE public."Bleachers"
SET trailer_height_in = height_folded_ft * 12
WHERE height_folded_ft IS NOT NULL;