# Durable chat history

Amayune stores conversations and messages in portable SQLite at `data/amayune.db` on the external M.2 SSD. Each user message is committed separately, and streaming assistant replies are checkpointed approximately every 1.5 seconds and at completion. SQLite WAL supports transaction recovery after interruption; the last uncommitted stream fragment can still be lost.

The chat UI loads the latest 200 messages and offers older pages. Search queries all stored messages, not just loaded pages. The new append API is idempotent by message ID. Existing browser history is imported without deleting SQLite conversations.

Write failures display a warning and are retried while the app remains open. Browser storage keeps a small recent cache only, not an unlimited crash-proof offline queue. If the SSD is disconnected before a write commits, that write is not guaranteed to survive browser shutdown. Disk capacity remains the practical storage limit.

New endpoints: `/api/chats/all`, `/api/chats/messages`, `/api/chats/search`, `/api/chats/upsert`, `/api/chats/message`, `/api/chats/import`, `/api/chats/item`. Legacy endpoints remain for compatibility.
