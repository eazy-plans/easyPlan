ALTER TABLE venues
  ADD COLUMN has_elevator boolean DEFAULT false,
  ADD COLUMN has_parking boolean DEFAULT false,
  ADD COLUMN is_accessible boolean DEFAULT false,
  ADD COLUMN has_public_transport boolean DEFAULT false;
