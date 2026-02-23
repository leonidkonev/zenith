# Zenith

A self-hosted Discord clone with a purple cosmic aesthetic. Servers (guilds), text and voice channels, DMs, roles and permissions, threads, reactions, mentions, typing indicators, presence, invite links, moderation, search, and file uploads.

## Tech stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS (dark mode)
- **Backend:** NestJS, Prisma, SQLite (no installation needed!)
- **Realtime:** Socket.IO
- **Auth:** JWT

## One-click start (Windows) — NO INSTALLATION NEEDED!

**Just double-click `START-ZENITH.bat`** — that's it!

The launcher will:
1. ✅ Download Node.js portable automatically (if not installed)
2. ✅ Install pnpm automatically
3. ✅ Create SQLite database automatically (no PostgreSQL needed!)
4. ✅ Create `.env` file automatically
5. ✅ Install all dependencies
6. ✅ Start the API and website

**Open http://localhost:3000** when it's ready!

> `http://localhost:4000` is the API server (JSON endpoints), not the UI homepage.
> If port `3000` is already in use, Next.js will automatically switch to `3001`/`3002` and print the exact URL in the terminal.

> **Note:** On first run, the launcher downloads Node.js (~50MB) which may take a minute. Subsequent runs are instant.

### Alternative: Manual start

If you prefer to run manually:
- **PowerShell:** `.\scripts\zenith-launcher.ps1`
- **Node.js:** `node scripts/launch.js` or `pnpm launch`
- **Batch:** `start.bat` (requires Node.js and pnpm installed)
  - Fast path: `start.bat` now skips install/db setup if dependencies + DB already exist.
  - Force full setup: `start.bat --fresh`
  - It starts API and Web together in one window.
  - If either API or Web fails, startup now stops and prints a clear failure message (instead of keeping a half-broken state).


### Share publicly with ngrok (alpha)

- Local/non-public launch (unchanged): `start.bat` or `pnpm launch`
- Public launch with ngrok:
  - `start-public.bat` (Windows)
  - `pnpm run launch:public`
- First-time setup (once on host machine):
  - `npx ngrok config add-authtoken <YOUR_TOKEN>`

The public launcher auto-configures API/WS/upload URLs for external access and prints shareable URLs.

### Building a single .exe

To build `zenith.exe` that does everything automatically:

```bash
npm install -g pkg
pkg scripts/launch.js --targets node18-win-x64 --output zenith.exe
```

Place `zenith.exe` in the ZenithApp folder and double-click. It will handle everything automatically (Node.js portable download, SQLite setup, dependencies, etc.).

## Local setup (manual)

1. **Clone and install**

   ```bash
   cd ZenithApp
   pnpm install
   # or: npm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` if needed (defaults work with SQLite):

3. **Database**

   ```bash
   pnpm db:generate
   pnpm db:push
   # or: npm run db:generate && npm run db:push
   ```

4. **Run**

   - API: `pnpm dev:api` or `npm run dev:api` (default port 4000)
   - Web: `pnpm dev:web` or `npm run dev:web` (default port 3000)

   Or run both with `pnpm dev` (or use `start.bat` / `pnpm launch`).

5. **First user**

   Open http://localhost:3000, click **Register**, and create an account. Then create a server from the app.

## Docker (optional)

For Docker deployment, you can still use PostgreSQL:

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to PostgreSQL connection string.

2. Build and start:

   ```bash
   docker compose up --build
   ```

3. Run migrations once:

   ```bash
   docker compose exec api npx prisma migrate deploy
   # or: docker compose exec api npx prisma db push
   ```

4. Web: http://localhost:3000 — API: http://localhost:4000

> **Note:** For local development, SQLite (default) requires no Docker or PostgreSQL installation!

## Project structure

- `apps/api` — NestJS API (auth, servers, channels, messages, threads, reactions, invites, DMs, moderation, search, uploads, WebSocket gateway)
- `apps/web` — Next.js frontend (cosmic purple theme, server/channel list, messages, composer)
- `packages/shared` — Shared types and constants

## Channel names

Channel names accept spaces, capital letters, emojis, and Unicode. They are stored and displayed as entered (no lowercasing or slug).

## License

MIT
