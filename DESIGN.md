# ANZ Questionnaire Design

## Typography

- Use self-hosted **Poppins**. Body and headings: weight 400; buttons: 600. Use 500 sparingly for emphasis.
- **H1:** `clamp(1.5rem, 1.35rem + 0.5vw, 1.875rem)` (24–30px), line-height 1.3, letter-spacing -0.025em.
- **H2:** `clamp(1.125rem, 1.05rem + 0.3vw, 1.375rem)` (18–22px), line-height 1.4, letter-spacing -0.015em.
- **H3 / panel headings:** 16–18px, line-height 1.5.
- **Body and controls:** 15px, body line-height 1.75.
- **Supporting text:** at least 13px. Do not shrink essential instructions or labels.
- Keep headings compact across workspaces, settings, modals and results. Let long titles wrap; avoid marketing-sized headings.
- Use sentence case. Avoid decorative uppercase labels, eyebrow text and repeated helper copy.

## Email typography

- Use the same Poppins font in the React Email editor and preview; provide Arial, sans-serif as the email-client fallback.
- H1: 24px / 1.3. H2: 20px / 1.4. Body: 15px / 1.7. Buttons: 14px, weight 600.
- Keep notification headings proportional to their short content.

## Colours and components

- Navy: `#06234f`. Primary: `#243085`. Hover: `#30419a`.
- Background: `#fbfcfe`. Soft blue: `#eef4ff`. Dividers: `#d9e1ea`. Supporting text: `#455e7d`.
- Use flat neutral surfaces, restrained dividers and 8–12px corners. Prefer spacing and alignment over extra cards or decoration.
- Buttons: at least 42px high. Form controls: at least 46px high, with visible labels and blue focus rings.
- Stack panels on smaller screens instead of shrinking text or controls. Keep editing and preview typography consistent.
- Preserve keyboard access, clear validation, loading feedback and reduced-motion support. Animate only useful state changes.
