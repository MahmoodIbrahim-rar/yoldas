# Miri Styles QA

## Turkish settings check — 2026-08-25

The Turkish settings screen displayed all three Miri styles: **supportive and warm**, **calm and direct**, and **energetic**. Each option included a concise description, and the interface explicitly stated that the selected tone does not change the health-guidance boundaries.

Saving the preference has not been performed against a live user account during local QA. The application code stores the selected value under `profiles.preferences.miri_style`; the edge function independently reads and validates that value server-side before constructing Miri's prompt.
