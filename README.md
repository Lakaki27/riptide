# Riptide

A personal, self-hosted music library and player — download or upload your own audio, organize it into playlists, and stream it back through a web app with a mobile-friendly PWA experience.

## Stack

- **Backend:** Express + TypeScript + TypeORM, Postgres
- **Frontend:** SvelteKit + Tailwind CSS v4, installable as a PWA
- **Object storage:** RustFS (S3-compatible, MinIO-successor)
- **Reverse proxy:** nginx
- **Ingestion:** yt-dlp (URL downloads) + ffmpeg (transcoding to Vorbis/OGG)
- **Auth:** JWT access tokens + rotating refresh tokens, role-based (admin/user)
- **Tooling:** Biome (lint/format), Vitest (tests), GitHub Actions CI
- **Deployment:** Docker images pushed to GHCR, deployed to a NixOS server via `deploy-rs` + `agenix`

## Features

- Paginated, searchable song library with infinite scroll
- Playlists (create, add/remove songs, sort by name/date)
- Artist pages with full discography playback
- Full-featured player: shuffle, loop (song/playlist), play-next/add-to-queue, persistent queue panel, volume, seek, keyboard shortcuts (space to play/pause)
- Mobile-first responsive UI with a swipeable "Now Playing" full-screen player (drag to skip tracks, drag down to dismiss)
- Listening statistics: top songs/artists, GitHub-style contribution heatmap, personal vs. global scope
- Admin-only: add music (URL download or drag-and-drop file upload), delete songs, manage user accounts (create/reset/delete), library resync, consume-folder bulk ingestion
- Forced password reset flow for admin-created accounts
- Theme (light/dark/system) and language preferences, tied to the user's account
- Multi-language support via Paraglide

## Local development

```bash
make init      # build and start the full stack
make test      # run backend + frontend tests
make check     # lint + type-check + test everything (mirrors CI)
```

The stack is served through nginx at `http://localhost:5173`. See `docker-compose.yml` for individual services.

### Environment variables

Copy `.env.dist` → `.env` in `backend/` and the project root, and fill in real values — JWT secret, database credentials, RustFS keys, and a seed admin account (created automatically on first boot).

## CLI ingestion

For bulk-importing existing local files without going through the web UI:

```bash
docker compose exec backend npm run ingest -- /consume
```

Drop files into `./consume/` on the host first.

## Deployment

Production images are built and pushed to `ghcr.io/<username>/riptide-{backend,frontend}`, then deployed to a NixOS host via `deploy-rs`:

```bash
make deploy
```

This builds both production Docker images (multi-stage builds, not the dev-mode images used locally), pushes them to GHCR, and triggers a `deploy-rs` activation against the target NixOS configuration.

## API docs

In non-production environments, a minimal Swagger UI is available at `/api/docs`.

## License / usage disclaimer

This project includes a URL-based audio download feature intended for content you have the legal right to download. See `/legal` in the running app for the full disclaimer.
