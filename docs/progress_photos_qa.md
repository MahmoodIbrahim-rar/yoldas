# Progress Photos QA

## Local interface check — 2026-08-25

The private-photo card appears on the progress screen without any placeholder images or fabricated progress. The empty state is explicit. During Turkish QA, the new photo labels initially remained Arabic because `applyLocale` checked only the original UI dictionary. The translation handler was corrected to read both the original and extended dictionaries for visible text and input placeholders.

Actual image upload, signed URL display, and deletion require the user to run `supabase/progress-photos-setup.sql` in their own Supabase project. No user image was uploaded during local QA.

After the fix, the Turkish progress screen displayed the card title, privacy badge, description, form labels, placeholder, save control, and empty state in Turkish. The layout remained readable without horizontal overflow.

After the live feedback correction, the Turkish form showed a branded “Fotoğraf seç” control with a “Dosya seçilmedi” state instead of the browser-default file button. The date, note, and save controls remained aligned on the same desktop row.

The next visual correction gave the capture-date and optional-note fields matching light surfaces, shaped borders, and an orange focus treatment. The Turkish desktop row stayed aligned and the calendar icon remained usable.
