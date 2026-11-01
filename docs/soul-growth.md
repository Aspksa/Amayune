# Soul Evolution 2.0 — foundational backend

Twelve tracks: living personality proposals, episodic memory, emotional context, relationship continuity through confirmed experiences, reflection records, adaptive communication, long-term goals, contextual curiosity, experience-based prompting, character stability, heuristic self-evaluation, and versioned growth (version history and rollback live in soul-evolution.mjs).

The new `soul-growth.mjs` store keeps user-confirmed episodes, explicit goals, reflections and **pending** growth proposals in SQLite. Proposals require explicit approval; the caller must apply approved deltas to `createEvolutionStore().evolve()`. This final wiring and approval API are **not yet implemented**. No automatic extraction or storage of personal memories, no autonomous agent, no Mood System, no UI changes.

Cloud.ru chat receives bounded contextual summaries of stored episodes and goals. Quality checks are heuristics and not factual verification.
