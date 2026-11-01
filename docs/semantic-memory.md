# Automatic semantic memory

Amayune automatically discovers embedding models from the Cloud.ru model catalog and tests candidate compatibility. If needed, `AMAYUNE_EMBEDDING_MODEL` may override automatic selection. The saved Cloud.ru API key is reused; no separate credentials are required.

When knowledge is approved, indexing is queued automatically. Chat requests also trigger indexing of any pending approved entries, in batches of 20, while responses can use previously indexed vectors. If the provider has no compatible embedding model, keyword retrieval continues to work. Model discovery retries after five minutes, and failed indexing has a one-minute cooldown.

Approved knowledge and user prompts are sent to Cloud.ru for embedding, which may incur charges. Vectors stay in the portable `data/amayune.db` file on the external M.2 SSD. Unapproved knowledge is never indexed or retrieved.

**Implementation:** exact cosine search over SQLite vectors, not the native `sqlite-vec` extension. It is appropriate for a modest personal knowledge base. It does not train the model's weights.
