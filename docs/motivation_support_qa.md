# Motivation Support QA

## Local Turkish check — 2026-08-25

The community screen displays the optional support card in Turkish with a clear description that messages are real, anonymous, and not part of a ranking. No support message was requested or created during QA, so the validation did not manufacture user-generated content.

The existing community table was unavailable in the local session, which is expected when the connected project has not been loaded for this browser session. The new `motivation_notes` table similarly requires one-time execution of `supabase/motivation-support-setup.sql` before live retrieval or opt-in saving can be verified.

The Turkish settings screen also displayed the private message field, explicit anonymous-sharing checkbox, and save button. No text was entered and no opt-in was saved during QA.

After live-feedback refinement, the Turkish community screen displayed the SQL activation instruction immediately and disabled the support action when `motivation_notes` was unavailable. No support message was requested or fabricated.
