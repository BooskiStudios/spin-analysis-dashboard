# Spin Examiner Dashboard

React + TypeScript dashboard for reviewing analyzed slot game sessions and individual spin events.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Node.js
- Express
- SQLite

## Features

- Fixed left sidebar listing analyzed games
- Session table for the selected game
- Spin table for the selected session
- Right-hand spin viewer with replay placeholder, metadata, and event timeline
- Mock data wired through React state for selected game, session, and spin

## Development

Install dependencies:

```bash
npm install
```

If PowerShell blocks `npm.ps1` on this machine, use `npm.cmd` instead:

```bash
npm.cmd install
```

Run the development server:

```bash
npm run dev
```

VS Code workspace support:

- Recommended extensions are listed in `.vscode/extensions.json`
- A `Start Vite Dev Server` task is available and runs `npm.cmd run dev -- --host 0.0.0.0`

Build for production:

```bash
npm run build
```

If PowerShell script execution is restricted, use:

```bash
npm.cmd run build
```

## Static Demo For GitHub Pages

The repository can also build a backend-free static demo using bundled example data.

Build the GitHub Pages version:

```bash
npm.cmd run build:pages
```

That build:

- uses bundled example games, sessions, and spins
- disables upload and create-game actions
- does not require the Express or SQLite backend
- emits asset paths compatible with the `spin-analysis-dashboard` GitHub Pages repo path

The Pages build is intended for public showcase/demo use, while local development can still run against the full backend API.

## Backend API

The project now includes a TypeScript + Express backend with SQLite storage.

Backend development server:

```bash
npm.cmd run dev:server
```

Seed demo data manually:

```bash
npm.cmd run seed:server
```

Build the backend only:

```bash
npm.cmd run build:server
```

Run the compiled backend:

```bash
npm.cmd run start:server
```

Default backend URL:

```text
http://localhost:4000
```

Storage paths:

- SQLite database: `storage/slot-analytics.sqlite`
- Uploaded source videos: `storage/uploads/`
- Processed session clips: `storage/sessions/`

Available routes:

- `POST /games`
- `GET /games`
- `POST /sessions`
- `GET /sessions/:gameId`
- `POST /sessions/:sessionId/spins`
- `GET /sessions/:sessionId/spins`
- `POST /upload-session-video`
- `POST /spins/:spinId/video`
- `GET /spins/:spinId`

Request notes:

- `POST /sessions` expects `gameId`, and accepts optional `totalSpins`, `rtp`, and `createdAt`
- `POST /sessions/:sessionId/spins` expects `spinNumber`, `winAmount`, `cascades`, `bonusTriggered`, `duration`, and optional `events`
- `POST /upload-session-video` expects a multipart form upload with the file field named `video`, accepts `.mp4`, `.mov`, or `.mkv`, stores the source video in `storage/uploads`, creates a session, and processes spin clips in the background
- `POST /spins/:spinId/video` expects a multipart form upload with the file field named `video`
- The API seeds demo games, sessions, and spins automatically on first startup if the database is empty
- Processed upload sessions expose `spinNumber`, `startFrame`, `endFrame`, `videoPath`, and `videoUrl` from `GET /sessions/:sessionId/spins` while preserving the original snake_case fields for compatibility