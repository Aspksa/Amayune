# Portable Amayune memory (Windows)

Chat history is stored in `data/amayune.db` beside the application on the external M.2 SSD. The server uses the built-in `node:sqlite` API, requiring Node.js 22.13+; older Node versions retain browser-local history until upgraded. No cloud database or account is required.

The first launch imports browser history if the SQLite database is empty. The current API synchronizes the complete chat list, so **run only one Amayune instance at a time** to avoid overwriting changes. The database uses transactional writes and rollback journaling (rather than WAL) for portable storage. Do not disconnect the SSD while Amayune is running. Back up `data/amayune.db` to another physical drive after shutting down the app.

The `knowledge` table is reserved for a later reviewed-memory and RAG implementation; no model training or semantic search is performed in this phase.
