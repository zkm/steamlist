# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `yarn dev` — start the dev server (http://localhost:3000)
- `yarn build` / `yarn start` — production build / serve
- `yarn lint` / `yarn lint:fix` — ESLint over `.js,.jsx,.ts,.tsx`
- `yarn format` / `yarn format:check` — Prettier
- `yarn test` — Jest (ts-jest). Run a single test file: `yarn test src/__tests__/suggest-game.test.ts`
- `yarn check` — the full pre-merge gate: lint + format:check + test (run in-band). CI (`.github/workflows/nextjs.yml`) runs install/build/lint/test on push/PR to `master`.
- `yarn steam:id <input>` — resolve a SteamID64 from a vanity URL/profile URL/legacy/ID3 format (`--write-env` to persist into `.env.local`)
- `yarn steam:games` — fetch the configured account's owned games into `public/steam_games.json` (gitignored; requires `STEAM_API_KEY` + `STEAM_ID64`)
- `yarn steam:games:sample` — copy `public/steam_games.sample.json` over `public/steam_games.json` for demo data without hitting the Steam API

ESLint config lives solely in `eslint.config.mjs` (flat config — required by ESLint 10, which no longer reads `.eslintrc.json`).

## Environment

Required in `.env.local` (gitignored): `STEAM_API_KEY`, `STEAM_ID64`. These are read server-side only (API routes, `scripts/*.js`) — never expose them to client components.

## Architecture

This is an intentionally **hybrid-router** Next.js app:

- **UI lives in the App Router** (`src/app/`). Every page (`page.tsx`, `game-library/page.tsx`, `badges/page.tsx`) and the components they render (`SuggestGame.tsx`, `GameLibrary.tsx`, `BadgeLibrary.tsx`) are `'use client'` components — there is no server-component data fetching in this app.
- **API endpoints live in the Pages Router** (`src/pages/api/*.ts`), using the `NextApiRequest`/`NextApiResponse` handler signature, *not* the App Router `route.ts` convention. When adding a new endpoint, add it under `src/pages/api/`, matching the existing style.

### Two independent data paths — don't conflate them

1. **Static snapshot**: `public/steam_games.json` (gitignored, produced by `yarn steam:games` or `yarn steam:games:sample`) is fetched directly by the client with `fetch('/steam_games.json')`. `GameLibrary.tsx` and `BadgeLibrary.tsx` (for app-name lookups) read from this snapshot — they do not hit the Steam API for the owned-games list.
2. **Live API routes**: `SuggestGame.tsx` calls `/api/suggest-game`, which does its own live `GetOwnedGames` fetch server-side on every request (does not read the JSON snapshot). `BadgeLibrary.tsx` calls `/api/badges`, which live-fetches `GetBadges` + `GetOwnedGames` server-side.

Both the client (`GameLibrary.tsx`) and the API routes (`suggest-game.ts`) independently call the public, CORS-open `store.steampowered.com/api/appdetails` endpoint per-appid — client-side for OS-compatibility badges in the library view, server-side for OS/spec filtering in the suggestion endpoint. There's a shared informal contract for parsing Steam's free-form HTML requirements text (RAM/VRAM/storage/cores/GHz/GPU vendor) duplicated between `suggest-game.ts` and `scripts/rank-gpu-heavy.js` — if you fix a parsing bug in one, check the other.

### Scripts (`scripts/*.js`)

Plain CommonJS Node scripts, not part of the Next.js build. Each hand-rolls its own `.env.local` loader (no dotenv dependency) rather than importing a shared module — keep new scripts consistent with that pattern unless you intentionally factor it out.

### Tests

Jest tests are colocated in `__tests__/` directories next to the code they cover (`src/app/__tests__/`, `src/__tests__/`), using `ts-jest` with a separate `tsconfig.jest.json` (CommonJS/node16 resolution) distinct from the app's `tsconfig.json` (bundler resolution, used by `next build`). API route tests mock `global.fetch` directly (see `src/__tests__/suggest-game.test.ts`) rather than mocking a network layer.
