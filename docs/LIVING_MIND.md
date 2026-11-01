# Living Mind 2.0 (initial implementation)

This feature models a **fictional AI companion**, not a conscious or biological entity.

## Components

- `server/living-mind.mjs`: persistent mood simulation, focus, turn count, review warnings, opt-in proactive suggestions, event log, reset.
- Existing `living-soul`, `soul-growth`, `soul-evolution`, and `soul` stores remain compatible. This release **does not** migrate or consolidate their SQLite files.
- Chat context includes a bounded mind state, existing user-approved memories and the current conversation. No unapproved memory is treated as confirmed.
- Initiative is disabled by default and produces suggestions only from approved open threads or goals; it never executes external actions.

## Local API

All endpoints require the existing `x-amayune-token` header.

- `GET /api/mind`: current state, initiative preference, recent review events.
- `PUT /api/mind/initiative` with `{"enabled":true}`: opt in.
- `GET /api/mind/suggestion`: suggested next topic, if enabled.
- `POST /api/mind/reset`: reset simulated state.
- `GET /api/living/proposals`: pending user-memory proposals.
- `POST /api/living/proposals/approve` with `{"id":"..."}`: approve.
- `POST /api/living/proposals/reject` with `{"id":"..."}`: reject.

## Limits

No voice, avatar animation, scheduled proactive delivery, unified database migration, or fully autonomous personality evolution is included yet. Reflection is rule-based and warnings do not rewrite generated answers. Test with `npm test` on Node.js 22.13+.
