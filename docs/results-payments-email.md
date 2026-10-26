# Results, payments, reports and email

## Results

In builder Settings, add zero or more **Result options**. Each has a title/message,
all/any conditions and stable question references. Operators: exact equals/notEquals,
multi-selection contains, numeric gte/lte. First matching result wins. No match and
forms without results show normal completion. The server replays the path before
evaluating and persists the result with the immutable release response.

## Paid questionnaires

Add a required email question on every submission path, enable payment in Settings,
select it as the respondent email and enter currency/amount in minor units.
Configure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and public HTTPS `APP_URL`
before publishing. Paid publishing fails closed without credentials.

Stripe webhook endpoint: `/api/stripe/webhook`. Subscribe to
`checkout.session.completed` and `checkout.session.async_payment_succeeded`.
The application checks the signature, stored session, response reference, amount,
currency and paid status. Redirects alone never confirm payment. Retries are
deduplicated; an open Checkout Session is reused. Refund/dispute administration
remains in Stripe; automatic refund/dispute lifecycle is not implemented.

Respondents first see confirmation inside the embed and can open a private
top-level confirmation page to pay. A new tab avoids Stripe's iframe restrictions.
Keep confirmation links private. `RESPONSE_ACCESS_SECRET` (or encryption-key
fallback) must remain stable. Capability links currently do not expire; rotating
the secret revokes them. Pages/downloads use no-store/no-referrer and noindex.

Staff open Responses to upload a readable unencrypted PDF (max 10 MB). PDFs are
stored privately in PostgreSQL, never public static uploads. Admin publication
requires verified payment for paid responses. Published files are immutable.
Staff can download drafts; respondents can download only published, paid files.

## Visual email editor

Administrators open **Email builder** (`/settings/email`). Templates are workspace-wide
for submission, verified payment and published report. Add/reorder header, text,
button and footer blocks, edit subject/content and inspect the sandboxed preview.
Variables: `{{questionnaire_title}}`, `{{message}}`, `{{status_url}}`.
Text/variables are HTML-escaped and button URLs must be HTTPS. Test sends are
restricted to the authenticated administrator's email.

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
`SMTP_FROM` in server `.env`; do not commit credentials. Enable delivery using:

```sh
docker compose --profile email up -d email-worker
```

Email jobs are transactional, unique per response/event, with retry/backoff and
failed state after eight attempts. SMTP delivery is at-least-once: a process crash
after acceptance but before commit may resend. A stable Message-ID helps recipients
deduplicate but is not an exactly-once guarantee. Monitor `email_jobs` state.
Without SMTP/worker, notifications remain queued; do not claim delivery.

## New input types and AI

Date, multi-box checkbox, searchable multi-select, phone and URL extend the
existing input types. Multi-selection answers are JSON-encoded string arrays for
compatibility with existing integrations. Multiple-selection branches match when
the selected answers include the configured choice; the first matching branch wins.
Use result `contains` to test selected values in result conditions.
AI authoring emits actual configuration, generation, validation and repair stages
over NDJSON. Proposals still require explicit staff application and publication.

Apply `003_outcomes_commerce_email.sql` with the normal migration runner after a
verified backup. Test payments with Stripe test credentials before live activation.
