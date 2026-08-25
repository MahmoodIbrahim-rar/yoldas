# Audio Feature Design

## Voice meal input

The user explicitly starts and stops a short microphone recording. The browser sends it only to a server-side endpoint with the Gemini key kept in Supabase secrets. The endpoint returns a transcript and a suggested meal description; the user must review or edit the text before any meal is saved. The initial version does not retain raw audio after transcription succeeds.

## Spoken daily summary

The user explicitly presses a button to request an audio summary. The server reads only the user-owned data for that day, generates a short non-medical text summary, and passes that text to a Gemini TTS model. The browser plays the returned audio in memory; it is not stored or played automatically.

## Technical constraints

Google's Gemini audio documentation supports audio understanding and text transcription through the Interactions API, including inline audio for small requests. Gemini TTS can produce audio from text and supports both Arabic and Turkish, but it is listed as Preview; therefore the interface will clearly mark the feature as optional and provide a text fallback. [Gemini Audio Understanding](https://ai.google.dev/gemini-api/docs/audio) [Gemini Text-to-Speech](https://ai.google.dev/gemini-api/docs/speech-generation)
