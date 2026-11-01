# Intelligence core — backend-only foundation

This release introduces eight **foundational** components without changing the UI:

1. Memory: conservative candidate extraction from user statements; candidates are unverified and never automatically promoted into trusted RAG.
2. Context: bounded conversation summarization utility and verified-fact prompt enrichment. Full cross-chat retrieval is not yet wired into the chat request path.
3. Reasoning: lightweight task complexity classification and planning instructions, not a separate multi-agent execution engine.
4. Truth: heuristic warning flags and explicit prompt instructions to distinguish facts from guesses. No external fact-checking is claimed.
5. Routing: primary/fallback model decision metadata. Existing Cloud.ru streaming still uses the configured primary model; no automatic price/capability benchmarking.
6. Reflection: heuristic answer review API. It does not silently regenerate answers.
7. Scheduler: periodic semantic indexing and exponential-backoff task runner; in-memory jobs do not survive process termination.
8. Evaluation: deterministic basic sample scoring; not a learned reward model.

Endpoints (CSRF-protected): POST /api/intelligence/analyze, /candidates, /summary, /review, /evaluate, /tick. All are backend-only.

Next hardening: persist scheduler jobs, wire summary retrieval to message IDs and conversation ownership, use a trusted fact-verification source, add real Cloud.ru model telemetry and regression benchmarks. Do not treat candidate extraction or heuristic scores as proof of truth.
