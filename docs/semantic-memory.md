# Semantic memory (optional)

Amayune can store embedding vectors alongside reviewed knowledge in portable SQLite. Configure the environment variable `AMAYUNE_EMBEDDING_MODEL` with an embedding model ID supported by your Cloud.ru account. An API key must already be saved in Amayune.

Call `POST /api/knowledge/index` with the existing local CSRF header to index up to 20 approved knowledge records per request. Repeat until `remaining` is zero. Indexing sends approved knowledge text to Cloud.ru and may incur charges.

Chat retrieval uses semantic similarity when configured and falls back to the existing keyword search on embedding failures. Unapproved knowledge is never retrieved. Vectors are kept on the external M.2 SSD in `data/amayune.db`.

**Current implementation uses exact cosine search over vectors stored in SQLite, not the sqlite-vec native extension.** This is suitable for a modest personal knowledge base, not large-scale approximate nearest-neighbor search. Indexing is manual, and changing the model requires re-indexing. The embedding endpoint and model availability must be verified against the Cloud.ru account.
