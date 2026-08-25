# Gym Mode QA

## Local interface check — 2026-08-25

The Arabic dashboard displayed the **Gym Mode** card after the 60-recipe library. The card contained fields for exercise name, set number, repetitions, and weight in kilograms, plus separate empty states for recent sets and recorded personal bests. No gym data were seeded or simulated during this check.

The local card showed `0` sets in the last seven days before any user record was inserted. Live insertion, personal-best detection, and Miri's gym-aware response remain pending until the user applies `supabase/gym-mode-setup.sql` to their Supabase project and redeploys `health-assistant`.

## Turkish interface check — 2026-08-25

After switching the same local session to Turkish, the gym title, labels, weekly counter, button, and both empty states rendered in Turkish with the expected left-to-right layout. The locale switch explicitly re-renders the dynamic gym content so previously rendered Arabic status text does not persist.
