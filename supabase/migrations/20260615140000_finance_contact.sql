ALTER TABLE "Events"
  ADD COLUMN finance_contact_uuid uuid REFERENCES "Contacts"(id) ON DELETE SET NULL;
