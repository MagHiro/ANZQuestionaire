# Questionnaire format v1

Definitions are portable JSON, independent of Next.js, PostgreSQL, AI, or ANZ business logic. Import/export is available under Settings. The executable schema and rules are in `src/core/questionnaire.ts`.

```json
{
  "schemaVersion": 1,
  "title": "Learning feedback",
  "description": "Help us make the next session better.",
  "completionTitle": "Thanks for sharing.",
  "completionMessage": "Your feedback has been received.",
  "questions": [
    {
      "id": "attended",
      "title": "Did you attend the session?",
      "description": "",
      "page": "Your experience",
      "type": "radio",
      "required": true,
      "options": [
        { "value": "yes", "label": "Yes" },
        { "value": "no", "label": "No" }
      ],
      "branches": [{ "equals": "no", "target": "$end" }],
      "next": "feedback"
    },
    {
      "id": "feedback",
      "title": "What would make the next session better?",
      "description": "",
      "page": "Your feedback",
      "type": "textarea",
      "required": false,
      "options": [],
      "branches": [],
      "next": "$end"
    }
  ]
}
```

## Staff handoff template

| ID       | Section    | Question            | Type     | Choices (value / label) | Required | If answer → question | Otherwise |
| -------- | ---------- | ------------------- | -------- | ----------------------- | -------- | -------------------- | --------- |
| attended | Experience | Did you attend?     | radio    | yes / Yes; no / No      | Yes      | no → Finish          | feedback  |
| feedback | Feedback   | What could improve? | textarea | —                       | No       | —                    | Finish    |

Supported types: `radio`, `dropdown`, `text`, `textarea`, `email`, `number`.

- Stable IDs must start with a letter and contain only letters, digits, underscores, and hyphens (64 characters maximum).
- Branches match exact string values. Choice conditions use stored `value`, not display `label`.
- Empty `next` means the next question in array order; `$end` means the answer-review screen.
- Branches can point only forward. Cycles and missing targets are rejected before publishing.
- At most 200 questions, 100 choices and 100 conditions per question.
- One question per screen; `page` groups screens under a section label. Multi-question screens and compound/cross-question conditions are not implemented in v1.
- Progress is an estimate based on position, and may adapt when branching skips questions.
- Hidden answers are excluded by replaying the applicable path on the server.
- Legal, migration, medical, scoring, and eligibility criteria require domain-owner approval. The generic engine does not invent or evaluate them beyond explicit flow rules.
