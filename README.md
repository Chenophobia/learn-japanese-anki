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

Get the code onto the host — clone the repo or `git pull` if it's already
checked out there, or `scp -r` the tree over:

```bash
git clone <repo-url> learn-japanese   # or: git pull, on an existing checkout
cd learn-japanese
```

Then create the data directory before the first run — the container has no
`USER` directive and runs as root, so if Compose creates `./data` itself on
first boot it will be root-owned; creating it yourself first keeps it owned
by the deploying user instead (see the note in "Backups" below) — and build
and run with Docker Compose:

```bash
mkdir -p data
cp .env.example .env
docker compose up -d --build
docker compose logs -f app
```

This builds the image (see `Dockerfile`), starts the container, and publishes
it on `127.0.0.1:3001` — bound to localhost only, since nginx (itself a
container) reverse-proxies to it rather than the app being exposed directly
(see the nginx section below; note that section also explains why there's no
TLS yet).

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

The container runs as root (no `USER` directive, matching the sibling
`chenaners-creative` deployment), so files it writes under `./data` may end
up owned by `root:root` on a Linux host — particularly if `./data` didn't
already exist before the first `docker compose up` and Compose created it.
If so, the backup/restore commands above need `sudo` to read or write those
files as a non-root operator.

### nginx (containerized)

nginx is **not** installed on the host — it runs as a container named
`nginx-proxy` (image `nginx:alpine`), defined in
`~/Documents/nginx/docker-compose.yml` and attached to a `proxy-net` Docker
network. Site configs aren't a single host file edited in place; they're
individual `.conf` files dropped into `~/Documents/nginx/conf.d/`, which is
bind-mounted into the container at `/etc/nginx/conf.d`. Certificates go in
`~/Documents/nginx/certs`, bind-mounted to `/etc/nginx/certs`.

Because nginx runs in its own container, `proxy_pass http://127.0.0.1:3001;`
inside that config would point at the nginx container itself, not this app —
`127.0.0.1` there means "the nginx container's own network namespace." This
app publishes to `127.0.0.1:3001` **on the host**, and on Docker Desktop for
Mac a container reaches the host through the special hostname
`host.docker.internal`. So the proxied config uses:

```nginx
server {
    server_name learn.chenaners.com;

    location / {
        proxy_pass http://host.docker.internal:3001;
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

A ready-to-use version of this lives at
`~/Documents/nginx/conf.d/learn-japanese.conf.disabled` (following the
pattern of the `example-app.conf.disabled` template). To activate it, drop
the `.disabled` suffix so it lands in `conf.d` as a real `.conf` file, then
test and reload the running container — no host nginx package, no
`systemctl`, no `sites-enabled` symlink:

```bash
mv ~/Documents/nginx/conf.d/learn-japanese.conf.disabled ~/Documents/nginx/conf.d/learn-japanese.conf
docker exec nginx-proxy nginx -t && docker exec nginx-proxy nginx -s reload
```

**There is currently no TLS.** The `certs/` directory is empty and no config
in `conf.d` listens on 443 — this note is not aspirational, it's the actual
current state. This matters more than it might look, because it actively
blocks login: `cookies.set` in `src/routes/login/+page.server.ts:27` and
`src/routes/signup/+page.server.ts:39` sets the session cookie with
`secure: true` whenever `NODE_ENV=production`, and a browser will silently
refuse to store a `Secure` cookie delivered over plain `http://`. Concretely:
until a certificate is issued and a `listen 443 ssl` block is added to the
`conf.d` config (with the cert/key paths under `~/Documents/nginx/certs`),
visiting `http://learn.chenaners.com` will let you submit the login form but
the session cookie will never be set, so the app will bounce you right back
to `/login`. **TLS must be configured before login works over
`learn.chenaners.com`.** In the meantime, the app is fully reachable for
testing directly at `http://127.0.0.1:3001` — `localhost`/`127.0.0.1` are
exempted from the `Secure` requirement, so login works there today. How the
certificate itself gets issued (certbot, another ACME client, manual) isn't
prescribed here; whatever tool is used, the resulting cert and key just need
to end up under `~/Documents/nginx/certs`, referenced from the `conf.d`
config's `ssl_certificate`/`ssl_certificate_key` directives.

This app doesn't currently read `X-Forwarded-Proto` — `@sveltejs/adapter-node`
only consults a forwarded-protocol header when `PROTOCOL_HEADER` is set, and
nothing here sets it, and SvelteKit's cookie handling already defaults
`secure` to true for any non-`localhost` host regardless of perceived
protocol. Forward it anyway: it's standard reverse-proxy practice, it means
nginx is telling the truth about the original scheme instead of silently
omitting it, and it means turning on `PROTOCOL_HEADER=x-forwarded-proto`
later (if some code path ever needs to know the original protocol) requires
no nginx change. If the deployment ever sits behind more than one proxy hop,
also set `ORIGIN=https://learn.chenaners.com` in `.env` so SvelteKit's CSRF
origin check passes.

Verify after deploying: for now, since there's no TLS yet, check
`http://127.0.0.1:3001` directly — it redirects to `/login`, signup works,
and studying a card persists across a page reload (the session cookie won't
show `Secure` here, which is expected on `127.0.0.1`). Once TLS is
configured, re-verify against `https://learn.chenaners.com`: it should
redirect to `/login`, signup should work, and the session cookie should show
`Secure`.

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
