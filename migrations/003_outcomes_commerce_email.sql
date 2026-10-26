ALTER TABLE responses ADD COLUMN IF NOT EXISTS result jsonb;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS respondent_email text;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required';
ALTER TABLE responses ADD COLUMN IF NOT EXISTS amount_minor integer;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS checkout_id text UNIQUE;
ALTER TABLE responses ADD COLUMN IF NOT EXISTS paid_at timestamptz;
CREATE TABLE IF NOT EXISTS stripe_events (id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS response_reports (
  response_id uuid PRIMARY KEY REFERENCES responses(id), filename text NOT NULL,
  content bytea NOT NULL, published_at timestamptz, uploaded_by uuid REFERENCES staff(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS email_templates (
  kind text PRIMARY KEY CHECK(kind IN ('submission','payment','report')),
  subject text NOT NULL, blocks jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS email_jobs (
  id uuid PRIMARY KEY, response_id uuid REFERENCES responses(id), kind text NOT NULL,
  recipient text NOT NULL, variables jsonb NOT NULL, state text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(response_id,kind)
);
