# ANZ Questionnaire

A standalone, single-workspace questionnaire application with a staff builder and an embeddable respondent experience. ANZ eligibility is its first intended integration, not a dependency of its core.

## Included

- Staff password authentication, hashed sessions, editor/admin roles, explicit admin publishing.
- Three-panel manual builder: questions, preview canvas, answer settings and conditional routing.
- Radio, dropdown, short/long text, email and number questions; one question per screen.
- Conversational AI proposals via an OpenAI-compatible endpoint; validation, actual-change summaries, explicit apply/discard and undo. It never publishes automatically.
- Draft saves, optimistic concurrency, saved revision history, portable JSON import/export.
- Immutable published releases and responses tied to the release completed.
- Responsive public runner, keyboard focus states, reduced-motion support, review and submission confirmation.
- Embedding allowlists, validated browser messaging, response dashboard, paginated JSON export.
- Signed webhook outbox with retry worker and authenticated server-side response retrieval.
- PostgreSQL migrations, Docker deployment configuration, health endpoint, CI, engine/persistence and browser tests.

## Local setup

Requirements: Node 22+, pnpm 10.23, PostgreSQL 17+.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Set DATABASE_URL to a dedicated database. Never reuse the existing ANZ website DB.
pnpm db:migrate
```

Create the first admin with a password passed over stdin (not command arguments or committed configuration):

```sh
read -r -s -p 'Admin password: ' PASSWORD
printf '%s' "$PASSWORD" | pnpm staff:create admin@example.com 'Workspace Admin' admin
unset PASSWORD
pnpm dev
```

Passwords must be at least 12 characters and at most 72 bytes. Add editors using the same operator command with role `editor`. There is no public signup, password-reset email or user-management UI yet. Operators can revoke all sessions for an account directly through a controlled DB operation; establish an account-recovery procedure before onboarding staff.

AI is optional: administrators can open **AI settings** in the workspace (`/settings/ai`) to configure the endpoint, model and encrypted API key, and test the saved connection. Changes apply immediately without a restart. Operators must first configure `SETTINGS_ENCRYPTION_KEY` with 32 random bytes encoded as 64 hexadecimal characters; back up this key securely with your database recovery materials. Keys cannot be decrypted if it is lost. `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` remain fallback values until settings are saved in admin. Only trusted administrators may configure provider endpoints. Network egress policy should also block private/internal destinations. Without AI configuration manual editing, import, preview and publishing still work. Hermes can be used if its serving endpoint implements the required OpenAI-compatible chat and JSON response interface. No specific external provider has been validated with real credentials yet.

## Production deployment

1. Provision a dedicated hostname, TLS reverse proxy, secrets and database. Set `APP_URL` to the externally visible HTTPS origin. Preserve its `Host` and protocol headers through the proxy. The proxy must enforce request size limits, public-endpoint rate limits and connection timeouts.
2. Copy `.env.example` to `.env`; set strong `POSTGRES_PASSWORD` and `DATABASE_URL=postgresql://questionnaire:<URL-encoded-password>@db:5432/questionnaire`. Do not commit `.env`.
3. Build and start PostgreSQL:

   ```sh
   docker compose build app operations
   docker compose up -d --wait db
   ```

4. Take and verify a database backup before upgrades. Run migrations explicitly:

   ```sh
   docker compose run --rm operations pnpm db:migrate
   ```

5. Create the initial admin with stdin using `docker compose run --rm -T operations pnpm staff:create ...`.
6. Start the app with `docker compose up -d --wait app`. It binds to `127.0.0.1:3100`; put TLS termination in front of it. Optional signed webhooks require the `webhooks` profile and configured secrets/allowlist.
7. Verify `/api/health`, login, a test publish/submission, CSP allowlists, signature checks and webhook retries. Confirm restore from backup before collecting real responses.

The app image runs as an unprivileged user. Migrations are transactional, checksum-verified, and advisory-locked. Never edit an applied migration. Runtime start does not automatically change the schema.

### Backups

```sh
mkdir -p backups
docker compose exec -T db pg_dump -U questionnaire -d questionnaire -Fc > backups/questionnaire.dump
docker compose exec -T db pg_restore --list < backups/questionnaire.dump
```

Store backups encrypted off-host, restrict file permissions, automate schedules and rehearse restore into a separate database. Treat exports and backups as personal data.

### Before live rollout

- Supply the approved eligibility question set; no legal criteria or live eligibility questions are seeded.
- Select and validate the AI provider and its data-processing terms.
- Configure TLS, infrastructure rate limits, observability, backup/restore, retention/privacy notice and account-recovery procedures.
- Review sensitive-data access and single-workspace integration credentials.
- Implement and test the receiving ANZ integration separately; no live website changes are included here.
- Validate the Docker build on a Docker-enabled host. Local Docker access was unavailable during initial implementation.

This is a functional first release with production-oriented controls, **not a claim that infrastructure, external-provider validation or security acceptance is complete**. File upload, scoring, compound rules, resumable sessions, multi-question pages, SSO/MFA, per-tenant isolation and drag-and-drop editing are not implemented.

## Validation

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm exec playwright test
pnpm audit --prod
```

Browser tests launch their own disposable PostgreSQL server on port 55439 and the built application on port 3199. They never use production database credentials. Linux test-binary installation requires the explicitly allowlisted `@embedded-postgres/linux-x64` postinstall script; see `pnpm-workspace.yaml`. PGlite is used only for fast persistence tests; the application uses PostgreSQL through `pg`.

## Architecture and design

- `src/core`: framework-independent schema, validation, flow evaluation and change summaries.
- `src/server`: PostgreSQL and staff/release persistence.
- `src/app`: web routes and authenticated server actions.
- `src/components`: staff builder and reusable runner UI.
- `migrations`: ordered PostgreSQL migrations.
- `docs/questionnaire-format.md`: input format and question-provider template.
- `docs/integration.md`: embedding and server-to-server security contract.

Visual baseline: `../anzwebsite/DESIGN.md`, mirrored in this project's `DESIGN.md`, with self-hosted **Poppins**, ANZ blue tones and the ANZ typography contract. The functional three-panel builder layout remains inspired by [Typeform on Mobbin](https://mobbin.com/screens/f985698e-8129-4fb2-b84d-e29755da1cbd). No third-party screenshots or branding assets are bundled.
