CREATE TABLE ai_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  base_url text NOT NULL,
  model text NOT NULL,
  encrypted_key text,
  updated_by uuid NOT NULL REFERENCES staff(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
