# Amayune Soul Core — phase 1

Selected modules: 1 Identity, 2 Personality, 3 Emotional Intelligence, 4 Relationship Memory, 5 Inner Reflection, 7 Values, 8 Growth, 9 Continuity, 10 Integration.

**Module 6 Mood System is deliberately excluded.** No simulated mood state is stored or inferred.

Implemented in `server/soul.mjs`: immutable AI identity and boundaries; tone guidance based on message wording; explicit-user preference memory in a dedicated SQLite database; corrections and reflections; deletion/reset; persistent state; bounded prompt context generator. Corrections are data for subsequent responses, not model fine-tuning. Reflection is heuristic, not independent consciousness or autonomous thought.

**Integration status:** backend API is standalone. The existing chat streaming endpoint does not yet invoke `buildSoulContext`. A follow-up must wire it into the existing Cloud.ru prompt flow with tests, opt-in memory controls, and privacy safeguards. No UI changes are included.
