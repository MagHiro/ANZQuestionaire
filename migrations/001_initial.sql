CREATE TABLE staff (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('editor', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE questionnaires (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  draft jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  published_release uuid,
  allowed_origins text[] NOT NULL DEFAULT '{}',
  webhook_url text,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES staff(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE releases (
  id uuid PRIMARY KEY,
  questionnaire_id uuid NOT NULL REFERENCES questionnaires(id),
  version integer NOT NULL,
  definition jsonb NOT NULL,
  published_by uuid NOT NULL REFERENCES staff(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (questionnaire_id, version)
);
ALTER TABLE questionnaires ADD CONSTRAINT published_release_fk FOREIGN KEY (published_release) REFERENCES releases(id);
CREATE TABLE draft_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  questionnaire_id uuid NOT NULL REFERENCES questionnaires(id),
  definition jsonb NOT NULL,
  revision integer NOT NULL,
  actor_id uuid NOT NULL REFERENCES staff(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(questionnaire_id, revision)
);
CREATE TABLE responses (
  id uuid PRIMARY KEY,
  release_id uuid NOT NULL REFERENCES releases(id),
  answers jsonb NOT NULL,
  path jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX responses_release ON responses(release_id, created_at DESC);
CREATE TABLE webhook_deliveries (
  id uuid PRIMARY KEY,
  response_id uuid NOT NULL UNIQUE REFERENCES responses(id),
  url text NOT NULL,
  payload jsonb NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  last_error text
);
CREATE TABLE rate_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL,
  reset_at timestamptz NOT NULL
);
CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES staff(id),
  action text NOT NULL,
  questionnaire_id uuid REFERENCES questionnaires(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
