# Embedding and integration

Publish as an administrator, then open **Share**. Add the exact parent origin (for example `https://www.anzmigrate.com`, without a trailing slash). The response `Content-Security-Policy: frame-ancestors` restricts which sites may embed the public form. Direct links remain public.

```html
<iframe
  src="https://forms.example.com/embed/your-form-slug"
  title="Eligibility questionnaire"
  style="width:100%;height:760px;border:0"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"
></iframe>
<script src="https://forms.example.com/embed.js" defer></script>
```

The helper validates both message origin and iframe window, resizes the embed, and dispatches `questionnaire:completed` on the iframe element. This is **only a UI notification**, never authorization to charge, generate reports, or grant access. Never put sensitive answers or service credentials in query strings.

## Trusted completion

1. Operator sets `WEBHOOK_SECRET` (32+ random characters) and comma-separated exact `WEBHOOK_ALLOWED_URLS`.
2. Administrator selects an allowlisted webhook destination in Share.
3. Enable the worker (`docker compose --profile webhooks up -d worker`).
4. Submissions and delivery events are committed in one transaction.
5. Worker sends an event containing `id`, `type`, `responseId`, `releaseId`, and `createdAt`. It does not send answers in the notification.

Verify `X-Questionnaire-Signature` as hex HMAC-SHA256 over `${timestamp}.${rawRequestBody}` using the shared secret. Verify `X-Questionnaire-Timestamp` is within five minutes. Use a constant-time comparison and deduplicate by `X-Questionnaire-Event`. Acknowledge promptly with 2xx. Delivery is at least once; it retries up to 10 times with exponential backoff. Alert on exhausted delivery rows in `webhook_deliveries`.

Fetch the corresponding answers server-side:

```text
GET /api/integration/responses/{responseId}
X-Questionnaire-Timestamp: <unix seconds>
X-Questionnaire-Signature: <HMAC-SHA256(secret, timestamp + '.GET./api/integration/responses/' + responseId)>
```

The HMAC integration credential currently has access to all responses in this **single-workspace deployment**. Do not share it with independent customers. Per-integration credentials and tenant isolation are required before offering this as a multi-tenant SaaS.

In this ANZ repository's future receiver, verify the signature, fetch the response, verify the expected release/questionnaire, map fields into the eligibility use case, and only then initiate the appropriate existing workflow. This project does not modify or migrate the existing ANZ website.

## Exports

Authenticated staff can download `/api/export/{questionnaireId}`. The response contains up to 1,000 records plus `nextCursor`; fetch `?after={nextCursor}` until it is null. The UI download retrieves one batch; large exports must follow this pagination contract.

## Retention and privacy

Response collection is public and versioned, but anonymous completion is not identity verification. Decide the lawful basis, privacy notice, retention duration, and access policy before collecting personal data. Use full-disk/managed-database encryption and encrypted backups; transport must use TLS. No respondent answers are sent to the AI authoring provider. Definitions and staff prompts are sent; do not paste personal data into the builder.
