CREATE TABLE lead_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'considering',
  rejection_reason text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(lead_id, venue_id)
);

CREATE INDEX idx_lead_inquiries_lead_id ON lead_inquiries(lead_id);
CREATE INDEX idx_lead_inquiries_venue_id ON lead_inquiries(venue_id);
CREATE INDEX idx_lead_inquiries_status ON lead_inquiries(status);

-- Trigger for updated_at
CREATE TRIGGER set_lead_inquiries_updated_at
  BEFORE UPDATE ON lead_inquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE lead_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_lead_inquiries" ON lead_inquiries
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "secretary_lead_inquiries" ON lead_inquiries
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'secretary');

CREATE POLICY "venue_owner_lead_inquiries" ON lead_inquiries
  FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'venue_owner'
    AND venue_id IN (SELECT id FROM venues WHERE owner_user_id = auth.uid())
  );
