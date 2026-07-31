# learn-japanese

A self-hosted flashcard app for studying the JLPT N4 curriculum in
[`docs/curriculum-plan.md`](docs/curriculum-plan.md) using FSRS
(Free Spaced Repetition Scheduler). Multiple users can sign up on the same
instance; each has independent progress and scheduling.

## Stack

- [SvelteKit 2](https://svelte.dev/docs/kit) + [Svelte 5](https://svelte.dev/docs/svelte), TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + [Drizzle ORM](https://orm.drizzle.team/)
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) for scheduling
- [@node-rs/argon2](https://github.com/napi-rs/node-rs) for password hashing
- Docker for deployment

## Development

```bash
npm install
npm run dev          # start the dev server
npm test             # run the test suite (vitest)
npm run db:generate  # regenerate drizzle migrations after editing schema.ts
```

`npm run build` produces a Node build in `./build` via `@sveltejs/adapter-node`.
As a side effect of the build, the code in `src/lib/server/db/index.ts` opens
(and seeds) `./data/app.db` locally — this is expected in dev and is not
carried into the Docker image (see "Deployment" below).

## Environment variables

Set these in a `.env` file (copy `.env.example` to start):

| Variable         | Purpose                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `DATA_DIR`       | Directory holding `app.db` (and its `-wal`/`-shm` sidecars). In Docker this is `/app/data`, bind-mounted from `./data` on the host.        |
| `SESSION_SECRET` | Reserved, **not currently read** by the app. Session ids are 32-byte CSPRNG tokens looked up server-side and are not HMAC-signed, so there is nothing to sign with a secret. Left in `.env.example` as a placeholder in case a future change needs it; safe to leave as-is or delete. |

## Deployment

Build and run with Docker Compose:

```bash
cp .env.example .env
docker compose up -d --build
docker compose logs -f app
```

This builds the image (see `Dockerfile`), starts the container, and publishes
it on `127.0.0.1:3001` — bound to localhost only, since the host's nginx
terminates TLS and reverse-proxies to it (see the nginx section below).

The app listens on `0.0.0.0:3001` inside the container. All persistent state
is the single SQLite file at `./data/app.db` on the host (bind-mounted to
`/app/data` in the container). Deleting or rebuilding the container never
touches `./data`.

Day-to-day commands:

```bash
docker compose logs -f app     # tail app logs
docker compose restart app     # restart without rebuilding
docker compose down            # stop (data stays in ./data)
docker compose up -d           # start again without rebuilding
```

Typical workflow: iterate with `npm run dev` → run `npm test` → deploy with
`docker compose up -d --build`.

### Backups

Stop the container, then copy the database file and its WAL sidecar (SQLite
keeps uncommitted data in `-wal` until it's checkpointed into the main file):

```bash
docker compose stop app
cp data/app.db data/app.db-wal /path/to/backup/   # -wal may not exist; that's fine
docker compose start app
```

Restore by stopping the container, copying the backed-up files back into
`data/`, and starting the container again.

### nginx (host)

Place in `/etc/nginx/sites-available/learn.chenaners.com`, symlink into
`sites-enabled`, then run certbot:

```nginx
server {
    server_name learn.chenaners.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    listen 80;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/learn.chenaners.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d learn.chenaners.com
```

`X-Forwarded-Proto` matters: without it, requests can look like plain HTTP to
the app, and SvelteKit's own request handling assumes plain HTTP too — which
undermines the "secure cookie" story you get from putting TLS in front of the
app. If the deployment ever sits behind more than one proxy hop, also set
`ORIGIN=https://learn.chenaners.com` in `.env` so SvelteKit's CSRF
origin check passes.

Verify after deploying: `https://learn.chenaners.com` redirects to `/login`,
signup works, the session cookie shows `Secure`, and studying a card persists
across a page reload.

## Content

Curriculum content (chapters, units, cards) lives in
`src/lib/server/seed/`. It is only loaded into the database once, the first
time the app boots against an empty `chapters` table — see "Known
limitations" below.

## Known limitations

- **Curriculum content only seeds once.** The seed runs only when the
  `chapters` table is empty. Editing `src/lib/server/seed/` after launch has
  no effect on an existing database; adding or changing content later needs a
  hand-written migration, or wiping `data/app.db` (which also destroys all
  user progress).
- **Day boundaries are UTC.** The daily new-card cap and the study streak
  both roll over at UTC midnight, not the user's local timezone.
- **No password reset flow.** Recovering an account means editing
  `users.password_hash` directly in the SQLite database.
