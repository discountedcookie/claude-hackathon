-- LINE IDs are also checked in the database (edit profile writes contacts directly): the same lenient rule as the forms.
-- NOT VALID keeps any older rows as they are; new and updated rows must match.
alter table public.contacts
  add constraint contacts_line_id_format check (line_id ~* '^@?[a-z0-9._-]{3,20}$') not valid;
