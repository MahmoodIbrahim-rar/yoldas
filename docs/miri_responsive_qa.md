# Miri Welcome Layout QA

Validated locally on 2026-08-25 after the Miri and welcome-scale update.

| Viewport | Locale | Result |
| --- | --- | --- |
| 390 × 844 | Arabic | The enlarged orange hero stacks above the information card, remains within the viewport width, and keeps its copy and step labels readable. |
| 768 × 1024 | Arabic | The responsive breakpoint switches to a single-column layout with an intact large hero, legible buttons, and no visible horizontal overflow. |
| 390 × 844 | Turkish | The hero remains within the viewport, Turkish copy is readable, and the 01–03 hero steps retain a left-to-right sequence. |
| 768 × 1024 | Turkish | The single-column layout remains intact with left-aligned Turkish content and no visible clipping or overflow. |
| Desktop browser preview | Turkish | The welcome step cards display in left-to-right order: 1, 2, 3, 4 from left to right. DOM positions were 51, 347, 643, and 938 px respectively, with no horizontal overflow. |

The live Miri tone remains pending deployment and user-side Supabase verification.

Additional welcome verification on 2026-08-25: the duplicate in-hero `Yoldaş` title was removed, while the enlarged trimmed white brand mark remained clearly visible at the top of the orange hero.
