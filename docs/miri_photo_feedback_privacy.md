# Miri Photo Feedback: Privacy and Safety Boundary

## Explicit user action only

The user must select one of their own saved progress photos and press a clearly labelled control before Miri receives anything. Yoldaş must not send, scan, compare, or analyze progress photos automatically. The request will use the signed image data for that one request only; Yoldaş does not create a public URL or a separate persistent copy for the feedback flow.

## What Miri may do

Miri may provide a short, respectful, non-medical reflection on the user-selected image, suggest consistent photo-taking conditions, and encourage gradual habits. The answer must be in the selected interface language and must identify that a photo is not a reliable health or body-composition assessment.

## What Miri must not do

Miri must not diagnose illness, estimate body fat, make attractiveness judgments, infer sensitive traits, prescribe treatment, promise visual outcomes, shame the user, or compare users. If the image contains a potentially urgent physical concern, the reply must recommend consulting an appropriate qualified professional.

## Data path

The edge function authenticates the caller, verifies the `progress_photos` row belongs to the caller, reads that caller-owned object from the private `yoldas-progress-photos` bucket, and sends the image bytes inline to Gemini with the user’s explicit request. Gemini’s image guide documents inline base64 image input for smaller request payloads and warns that inline requests have a 20 MB total request limit. Yoldaş separately limits image uploads to 8 MB.

## Reference

[Google Gemini API — Image understanding](https://ai.google.dev/gemini-api/docs/image-understanding), accessed 2026-08-25.
