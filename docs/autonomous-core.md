# Amayune Autonomous Core — initial backend foundation

Ten tracks are represented in the standalone `server/autonomous.mjs` module:

1. Agent: bounded two-stage execution with explicit injected reason/review functions.
2. Tools: allowlisted read and create-only file operations; write disabled by default. Never execute arbitrary shell commands.
3. Reasoning: deterministic plan with step budget, not full autonomous replanning.
4. Memory graph: SQLite facts with explicit verification.
5. Learning: SQLite correction history; no model weight training.
6. Cloud routing: metadata-based model selector, not connected to Cloud.ru transport yet.
7. Scheduler: durable SQLite jobs and event log; execution worker not yet wired.
8. Self-healing: retry backoff and persisted job states; no automatic code repair.
9. Research: explicitly injected search adapters; no autonomous web browsing.
10. Safety/evaluation: path containment, tool allowlist, bounded outputs, heuristic assessment.

This is a **foundation**, not production-ready autonomous operation. No UI changes. No arbitrary commands, automatic destructive actions, or autonomous external writes. Integration with existing API, Windows process lifecycle, provider metrics and explicit approval flow is still required. Test via `npm test`.
