CREATE TABLE public."EventBleacherRequirements" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_uuid UUID NOT NULL REFERENCES public."Events"(id) ON DELETE CASCADE,
  bleacher_type_uuid UUID NOT NULL REFERENCES public."BleacherTypes"(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_uuid, bleacher_type_uuid)
);

CREATE INDEX idx_ebr_event_uuid ON public."EventBleacherRequirements"(event_uuid);

-- Backfill from hardcoded seven_row / ten_row / fifteen_row columns
-- Match by row_count + roof_type = 'none'
INSERT INTO public."EventBleacherRequirements" (event_uuid, bleacher_type_uuid, quantity)
SELECT e.id, bt.id, val.qty
FROM public."Events" e
CROSS JOIN LATERAL (
  VALUES (7, e.seven_row), (10, e.ten_row), (15, e.fifteen_row)
) AS val(rows, qty)
JOIN public."BleacherTypes" bt
  ON bt.row_count = val.rows AND bt.roof_type = 'none' AND bt.deleted = false
WHERE e.deleted = false
  AND val.qty IS NOT NULL
  AND val.qty > 0
ON CONFLICT (event_uuid, bleacher_type_uuid) DO NOTHING;

-- Enable RLS
ALTER TABLE public."EventBleacherRequirements" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read event bleacher requirements"
  ON public."EventBleacherRequirements"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert event bleacher requirements"
  ON public."EventBleacherRequirements"
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update event bleacher requirements"
  ON public."EventBleacherRequirements"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete event bleacher requirements"
  ON public."EventBleacherRequirements"
  FOR DELETE TO authenticated USING (true);
