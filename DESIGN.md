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
- Typeform-inspired studio composition supersedes the earlier gradient treatment: flat white canvas, neutral side panels, compact toolbar, restrained dividers and 8–12px corners. Retain Poppins and ANZ blue colours. Workspace buttons use sentence case. Keep input outlines and focus indicators for usability.
- Expand editor side panels to accommodate readable controls; stack panels responsively rather than reducing type size.
- AI provides selected-question context, short conversation history, clarification requests, a validated repair attempt, actual change summaries and proposal preview. Approval and publishing remain separate. Prevent outdated proposals overwriting newer manual edits.

## Editor navigation

- Desktop editors use independently scrolling question/block lists, canvas and settings panels. Smaller screens stack panels without shrinking controls.
- Question toolbar arrows select the previous/next question; only drag handles change question order. Handles support pointer, touch and keyboard (Space to pick up/drop, arrows to move, Escape to cancel).
- The Logic view uses a zoomable branching node map with freely draggable nodes. Draw connections from answer/default handles, reconnect target endpoints, or select an edge to remove a condition/reset the default. Retain the routing inspector as a keyboard-accessible alternative. Preserve first-match ordering and reject backward/self routes; diagram edits update the same draft routing definition.
- Payment has its own tab. Free questionnaires do not require the submission-readiness checkbox; paid questionnaires do. Paid questionnaires hide automated Outcomes and return no automatic result, using the adviser-published PDF report instead. Preserve stored outcome rules when switching payment modes.
- Email composition uses a full-width workspace: current/available blocks on the left, sandboxed preview in the middle and selected-block customization on the right.
- Composition references: [Typeform](https://mobbin.com/screens/18924c96-2eb9-4aa6-8946-c24c22ae33fc), [Flodesk](https://mobbin.com/screens/d3f4ad0e-6710-492f-a4fd-a2f4ec228367). No third-party artwork is included.

## Loading and feedback

- Show an animated spinner on the active asynchronous action, not on unrelated disabled actions. Preserve descriptive loading text for reduced-motion users.
- Editor/settings route transitions have loading feedback; do not add a root streaming boundary that changes private confirmation 404 responses.
- Email and AI settings distinguish errors (alerts) from successful completion (status). Preserve entered values on failure.
- Inputs, native editor select triggers, checkboxes, radios, switches and file selectors share styled focus and selection states. Native editor select menus retain platform keyboard/accessibility behaviour; respondent dropdown popups are custom styled.
- Animate only state changes, with reduced-motion overrides.

## Builder panels and AI

- Question and settings sidebars collapse independently with labelled controls.
- On desktop the AI conversation is a side panel beside the canvas, rather than a bottom dock. Small screens keep a stacked layout.
- Create with AI opens a prompt dialog; generation continues in the side panel. Render assistant summaries and conversation as safe Markdown without raw HTML. Staff still explicitly apply, save and publish proposals.
- Saving remains available after publication, including when the draft is unchanged; draft saves never update the published release.
- Payment uses one heading and major-currency price entry, stored as integer minor units. Responses use compact headers and status-labelled rows; PDF management is shown only for paid questionnaires.
