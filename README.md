# Amayune Windows launcher

The repo currently contains launcher infrastructure, **not** a runnable web application.

## Instructions

1. Add the application, `package.json`, and committed `package-lock.json`.
2. Copy `launcher.config.example.json` to `launcher.config.json` and configure the real npm start script, build outputs, and HTTP health endpoint.
3. Double-click `Amayune.bat` .

The server must accept `HOST=127.0.0.1`, `PORT`, and `AMAYUNE_DATA_DIR`. The browser opens only after an HTTP 2xx health response. Run logs are saved to `logs/launch.jsonl` and user data belongs in `data/`.

To bootstrap a missing runtime, add `runtime-manifest.json` containing `node: {url,sha256}` (official nodejs.org Windows ZIP) and optionally `python: {url,sha256}` (official python.org embeddable Windows ZIP). Both hashes must be independently pinned beforehand. No unknown binary is downloaded or run. For offline use, supply compatible system binaries or portable `.runtime` binaries. Python embeddable distributions do not include pip.

`node scripts/update.mjs` applies an explicitly staged file update listed in `.runtime/updates/manifest.json`. It checks SHA-256, creates a backup, rolls back on copy errors, and rejects protected folders. **Do not run it while the server is running.** Review updates before applying.

## Validation

`node --test scripts/*.test.mjs` exercises JavaScript modules. Windows 10/11 double-click, Cyrillic paths, UNC, external SSD, offline setup, occupied ports, corruption, concurrency, and rollback require real Windows testing. No such testing has been completed yet; this is not yet a verified one-click distribution.
