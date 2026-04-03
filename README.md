# Flappy ECS

Browser game eksperimen Flappy-style yang dibangun dengan Entity Component System, PixiJS, dan backend physics yang bisa jalan di worker.

Live site: https://flappy.arifz.com/

Repository: https://github.com/ArifZx/flappy-ecs

## Docs

- `docs/architecture.md`: broader project architecture notes
- `docs/ffa-integration.md`: focused FFA multiplayer notes and implementation rules

## Workspace Layout

```text
apps/
	web/       # Vite client game
	server/    # Multiplayer/session server scaffold
packages/
	shared/    # Shared multiplayer types and protocol contracts
```

## Development

Environment config:

- `apps/server/.env` for the multiplayer server
- `apps/web/.env` for the Vite client

Available variables:

- `PORT` defaults to `3001`
- `VITE_SERVER_URL` defaults to `http://localhost:3001`

```bash
pnpm install
pnpm dev
```

Run the server scaffold separately when needed:

```bash
pnpm dev:server
```

The server loads `.env` automatically via `dotenv`. The web app reads Vite variables from `import.meta.env`.

## Build

```bash
pnpm build
pnpm preview
```
