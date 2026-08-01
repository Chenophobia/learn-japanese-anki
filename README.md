# learn-japanese

A self-hosted flashcard app for studying the JLPT N4 curriculum in
[`docs/curriculum-plan.md`](docs/curriculum-plan.md) using FSRS
(Free Spaced Repetition Scheduler). Multiple users can use the same instance,
each with independent progress and scheduling — but there is no self-signup;
the operator creates every account (see "Creating users" below).

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
it on `127.0.0.1:3001` — bound to localhost only, since a host-level nginx
reverse-proxies to it rather than the app being exposed directly (see the
"Reverse proxy and TLS" section below, which also covers where TLS is
actually terminated).

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

### Creating users

There is no signup page — it was removed after launch because the app is
reachable on a public domain and open registration invited bot accounts (see
`docs/superpowers/specs/2026-07-31-flashcard-app-design.md` for the
superseded design). The **only** way to add an account now is for the
operator to run the `create-user` script, with the main app stopped first so
exactly one process ever touches `app.db`:

```bash
docker compose stop
docker compose run --rm \
  -e CREATE_USER_USERNAME=someone \
  -e CREATE_USER_PASSWORD='a-strong-password' \
  app npm run create-user
docker compose start
```

`docker compose run --rm` starts a throwaway container sharing the same
`./data` bind mount, runs `scripts/create-user.ts` in it via `tsx` — straight
off the TypeScript source, no separate build step — and exits; the main app
isn't running at that point, so there is never a second live connection to
the database (see the WAL/virtiofs warning under "Backups" below for why
that matters on this host). **The app is unreachable for the few seconds
between `stop` and `start`** — this is a single-container deployment, so
creating a user briefly takes the site down; that's expected, not a fault.

The script reuses the app's own validation, password hashing, and
duplicate-username checks, so a manually created account can't bypass any
constraint the login flow assumes. Username/password are read from
environment variables rather than argv specifically so the password doesn't
land in shell history the way an argv-based invocation would. A duplicate
username is refused with a non-zero exit code and a clear message; success
prints `Created user "<username>" (id <id>).`.

If the app must stay up (e.g. mid-incident), `docker exec -e
CREATE_USER_USERNAME=someone -e CREATE_USER_PASSWORD='a-strong-password'
learn-japanese npm run create-user` also works — but it briefly puts a
second connection on `app.db` while the container is running, so restart the
container afterward (`docker compose restart app`) as a precaution. Prefer
the `stop` / `run --rm` / `start` sequence above whenever you can afford the
few seconds of downtime.

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

**Stop the container before any ad hoc direct inspection of `app.db`** — e.g.
opening a `sqlite3` shell or a scratch `docker exec ... node` script against
it — while the app is also running. On this deployment's macOS host, `./data`
is a bind mount served over virtiofs into the Linux container, and WAL
mode's shared-memory locking (the `-shm` file) does not work across that
boundary. A second process opening the database was observed, on this live
deployment, to checkpoint and unlink the WAL out from under the running app,
corrupting its view of the database. This is not a theoretical risk — it
happened. Stop the container (`docker compose stop app`) before poking at
`app.db` directly, and start it again afterward. This is exactly why
`create-user` (above) is normally run with the app stopped
(`docker compose stop` / `run --rm` / `start`) rather than against the live
container.

### Reverse proxy and TLS

The real request path to this app is:

```
Browser --HTTPS--> Cloudflare edge --Cloudflare Tunnel--> cloudflared (on this Mac)
       --> 127.0.0.1:8089 (Homebrew nginx on the HOST) --> 127.0.0.1:3001 (Docker app)
```

**TLS is terminated by Cloudflare at the edge.** The origin (this Mac) never
holds a certificate and doesn't need one. Everything downstream of
Cloudflare — the tunnel hop into `cloudflared` and the proxy hop from
`cloudflared` into nginx — is plain HTTP over localhost, which is fine
because none of it leaves the machine.

`cloudflared` runs as a Homebrew service on the host (not a container):

```
/opt/homebrew/opt/cloudflared/bin/cloudflared tunnel --config /Users/chenanigans/.cloudflared/config.yml --no-autoupdate run
```

Its config (`~/.cloudflared/config.yml`) maps hostnames to local ports via
`ingress` rules, matched top-to-bottom with a catch-all 404 at the end:

```yaml
tunnel: c1034261-b58e-4617-9a78-071118577f1e
credentials-file: /Users/chenanigans/.cloudflared/c1034261-b58e-4617-9a78-071118577f1e.json
ingress:
  - hostname: chenaners.com
    service: http://localhost:8088
  - hostname: www.chenaners.com
    service: http://localhost:8088
  - service: http_status:404
```

The reverse proxy itself is **Homebrew nginx running on the host** — not a
container — with site configs in `/opt/homebrew/etc/nginx/servers/`. The
existing `chenaners.conf` there listens on `127.0.0.1:8088`. This app gets
its own file, `/opt/homebrew/etc/nginx/servers/learn-japanese.conf`,
listening on `127.0.0.1:8089` instead (8088 is already taken by
`chenaners.conf`) and proxying to the app container:

```nginx
server {
    listen 127.0.0.1:8089;
    server_name learn.chenaners.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 120s;
    }
}
```

Both `127.0.0.1:8088` and `127.0.0.1:8089` are bound to localhost only —
never exposed publicly. Public traffic only ever reaches them via the
Cloudflare Tunnel.

This config file already exists on the host and `nginx -t` passes against
it, but it is **not live yet**. Going live needs this checklist, in order:

- [ ] Reload host nginx to pick up the new server block — this is Homebrew
      nginx on the host, **not** `docker exec`:
      ```bash
      nginx -t && nginx -s reload
      ```
- [ ] Add an ingress rule for `learn.chenaners.com` to
      `~/.cloudflared/config.yml`, pointing at `http://localhost:8089`,
      **above** the catch-all `- service: http_status:404` entry —
      cloudflared matches ingress rules in order and the catch-all swallows
      anything listed after it.
- [ ] Create the DNS route:
      ```bash
      cloudflared tunnel route dns c1034261-b58e-4617-9a78-071118577f1e learn.chenaners.com
      ```
- [ ] Restart the tunnel so it picks up the new config. This briefly
      interrupts `chenaners.com` too, since both hostnames share the one
      `cloudflared` process.

`X-Forwarded-Proto` is hardcoded to `https` above rather than passed through
as `$scheme` because the tunnel-to-nginx hop is plain HTTP — `$scheme` there
would report `http`, misreporting the browser's actual HTTPS connection to
Cloudflare. This app doesn't currently read the header anyway —
`@sveltejs/adapter-node` only consults a forwarded-protocol header when
`PROTOCOL_HEADER` is set, and nothing here sets it, and SvelteKit's cookie
handling already defaults `secure` to true for any non-`localhost` host
regardless of perceived protocol. It's forwarded anyway as standard
reverse-proxy practice and so that turning on
`PROTOCOL_HEADER=x-forwarded-proto` later (if some code path ever needs the
original protocol) is a no-op. If the deployment ever sits behind more than
one proxy hop, also set `ORIGIN=https://learn.chenaners.com` in `.env` so
SvelteKit's CSRF origin check passes.

Secure cookies already work fine, and always would have: the browser's
connection to Cloudflare is HTTPS, and the `Secure` cookie attribute is
enforced by the browser against its *own* connection scheme — the plaintext
hops behind Cloudflare are invisible to it. There is no TLS gap blocking
login; the only remaining work is the checklist above to route
`learn.chenaners.com` to this app at all.

**The `nginx-proxy` Docker container (defined under `~/Documents/nginx/`) is
not part of this path.** It publishes port 80 and its `conf.d` holds only a
`default.conf` returning 404 — nothing routes through it. Don't drop a
config into `~/Documents/nginx/conf.d/` expecting it to take effect; it
won't, because the tunnel talks to Homebrew nginx on port 8088/8089, not to
this container.

Verify after deploying: once the checklist above is complete, check
`https://learn.chenaners.com` — it should redirect to `/login`, a user
created with `create-user` (see "Creating users" above) should be able to
sign in, and studying a card should persist across a page reload, with the
session cookie showing `Secure`. In the meantime the app remains
reachable for testing directly at `http://127.0.0.1:3001`
(`localhost`/`127.0.0.1` are exempt from the `Secure` requirement, so login
works there today regardless of tunnel/nginx state).

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
