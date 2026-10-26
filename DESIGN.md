# ANZ Questionnaire Design Direction

## Interactive controls and workflow feedback

- Respondent dropdowns use a branded Radix popup with keyboard navigation; multi-select uses searchable styled selection cards.
- Dates use a branded calendar with month/year selectors, not an unstyled browser date popup.
- Text, email, phone, URL, number, textarea, checkbox, file controls and editor selects share Poppins, blue focus rings, rounded pale-blue surfaces and readable 15px+ text.
- AI progress announces real server stages in an accessible live region; never simulate percentages or expose hidden reasoning.
- Results are optional, ordered conditional cards. Confirmation remains available with or without a matching result.
- Paid workflows explicitly separate answer submission, Stripe payment verification and private report publication.
- Visual email composition uses reorderable header, text, button and footer blocks with a sandboxed preview.

Source of truth: `../anzwebsite/DESIGN.md`. This supersedes the initial Jalanin baseline.

- Self-host Poppins at weights 400, 500 and 600; headings/body 400, tiny uppercase labels 500, buttons 600.
- H1: `clamp(2.5rem, 1.9rem + 3.2vw, 4rem)`, line-height 1.04, tracking -0.04em.
- H2: `clamp(1.875rem, 1.45rem + 1.9vw, 2.75rem)`, line-height 1.08, tracking -0.035em.
- H3: `clamp(1rem, 0.95rem + 0.4vw, 1.0625rem)`, line-height 1.5, tracking -0.01em.
- Body: 0.9375rem, line-height 1.75, regular weight, readable text measure.
- Eyebrows: 0.6875rem, uppercase, weight 500, tracking 0.18em, short accent rule.
- Buttons: 0.75rem, uppercase, weight 600, tracking 0.06em.
- Navy #06234f; primary #243085; hover #30419a; soft blue #eef4ff; pale background #fbfcfe; divider #d9e1ea.
- Source body color is #607793. Use darker tonal #455e7d for small labels and supporting copy to preserve readable contrast.
- Keep the functional three-panel editor, responsive layouts, keyboard/focus behaviour and reduced-motion support.
- Graphics use original local geometry/icons. No invented endorsements or immigration outcomes.

## Workspace readability and surfaces (updated)

- Functional UI overrides the marketing scale: navigation, question lists, editor labels/fields, AI input and supporting copy use 15px; metadata/helper text uses 13px minimum. Tiny IDs and decorative chips are secondary only.
- Builder and respondent question headings use `clamp(2rem, 1.5rem + 1.5vw, 3rem)`, line-height 1.15, tracking -0.03em. Avoid hero-sized headings competing with small editing controls.
- Workspace buttons use 13px and a 42px minimum height; form controls use a 46px minimum height.
- Question canvas, AI composer, content cards and flow nodes are borderless, with 18px corners, white-to-pale-blue gradients and subtle blue-tinted shadows. Keep input outlines and focus indicators for usability.
- Expand editor side panels to accommodate readable controls; stack panels responsively rather than reducing type size.
- AI provides selected-question context, short conversation history, clarification requests, a validated repair attempt, actual change summaries and proposal preview. Approval and publishing remain separate. Prevent outdated proposals overwriting newer manual edits.
