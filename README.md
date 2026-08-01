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
npm run lint         # prettier --check + eslint (what CI runs)
npm run format       # rewrite files with prettier
npm run check        # svelte-check (typechecking)
npm run db:generate  # regenerate drizzle migrations after editing schema.ts
```

`npm run build` produces a Node build in `./build` via `@sveltejs/adapter-node`.
As a side effect of the build, the code in `src/lib/server/db/index.ts` opens
(and seeds) `./data/app.db` locally — this is expected in dev and is not
carried into the Docker image (see "Deployment" below).

## CI, code quality, and automated maintenance

Every push and PR runs the `CI` workflow (`.github/workflows/ci.yml`):
Prettier, ESLint, svelte-check, the vitest suite, and a production build;
when all of that passes on `main`, the same run builds the `linux/arm64`
Docker image and pushes it to
`ghcr.io/chenophobia/learn-japanese-anki:latest`, which the deployment host
polls (see "Continuous deployment" below). PRs build the image without
pushing, so a broken Dockerfile fails the PR, not the deploy.

Around that core:

- **CodeQL** (`.github/workflows/codeql.yml`) scans for security issues on
  every push/PR and weekly.
- **Dependabot** (`.github/dependabot.yml`) opens weekly PRs for npm
  packages, GitHub Actions, and the Dockerfile base image, all on Monday
  morning so a week's updates arrive together. Everything is grouped: npm
  produces at most two PRs (one for minor/patch, one for majors) rather than
  one per package, and Actions and Docker produce one each. Two bumps are
  ignored because they can never be right — TypeScript majors (SvelteKit's
  peer range stops at 6) and Node majors (only even-numbered lines become
  LTS, and Dependabot offers the newest tag regardless).
- **Auto-merge** (`.github/workflows/dependabot-auto-merge.yml`) flags
  Dependabot's minor/patch PRs to merge automatically **once CI passes**.
  If CI fails, nothing merges and nothing deploys — the PR just stays open
  for a human. Major version bumps always wait for manual review. This
  relies on two repo settings: "Allow auto-merge" and a branch ruleset
  making the CI checks required on `main`.

The lint gate is `npm run lint` — Prettier (`.prettierrc`) plus ESLint's
recommended JS/TS/Svelte rule sets (`eslint.config.js`). Rules that don't
fit this app (`no-navigation-without-resolve` — there is no `paths.base`)
are switched off in the config with a comment saying why; one-off intentional
violations carry inline `eslint-disable` comments with the rationale.

## Environment variables

Set these in a `.env` file (copy `.env.example` to start):

| Variable         | Purpose                                                                                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATA_DIR`       | Directory holding `app.db`. In Docker this is `/app/data`, bind-mounted from `./data` on the host.                                                                                                                                                                                    |
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

### Continuous deployment (pull-based)

The hands-off alternative to building on the host: CI publishes
`ghcr.io/chenophobia/learn-japanese-anki:latest` on every green `main`
build, and a launchd agent on this Mac runs `deploy/update.sh` every 5
minutes — it pulls, and restarts the container only when the image actually
changed. No inbound access to the Mac, no self-hosted runner (GitHub warns
against those on public repos: any exposed secret or runner compromise is a
path onto the host).

The pieces, all under `deploy/`:

- `compose.yml` — same container, ports, `.env`, and `../data` bind mount as
  the root compose file, but `image:` from GHCR instead of `build: .`.
- `update.sh` — pull + `up -d` + prune, logging only actual deploys to
  `deploy/update.log`.
- `com.chenophobia.learn-japanese.update.plist` — launchd agent running the
  script every 5 minutes. It is a template: launchd won't expand `~`, so
  `__REPO__` is substituted with the checkout path at install time (see the
  comment in the file).

One-time cutover from the build-on-host container, run from the repo root:

```bash
docker compose down                        # stop the locally-built container (data survives in ./data)
docker compose -f deploy/compose.yml up -d # start from the GHCR image
sed "s|__REPO__|$PWD|g" deploy/com.chenophobia.learn-japanese.update.plist > ~/Library/LaunchAgents/com.chenophobia.learn-japanese.update.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.chenophobia.learn-japanese.update.plist
```

This requires the GHCR package to be pullable from the host: either set the
`learn-japanese-anki` package to **public** on GitHub (Packages → package
settings → Change visibility) after the first CI push, or `docker login
ghcr.io` on the host with a read-only `read:packages` token.

To roll back a bad deploy: unload the agent (`launchctl bootout ...`), then
`docker compose -f deploy/compose.yml up -d` a previous `sha-*` tag by
editing `image:` in `deploy/compose.yml`, or fall back to
`docker compose up -d --build` from a known-good checkout.

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

**Check for that success line, not just the exit code.** Piping the script
through `tail` makes `$?` report the exit status of `tail`, not of the
script — a failed creation then looks like a success. This bit the initial
deployment: an account was created with a throwaway password from a
duplicate-username test, and the "already taken" refusal that followed was
read as proof the guard worked rather than as evidence the real account had
never been created.

### Resetting a password

There is no self-service password reset. Use the `set-password` script,
which changes the hash in place and so keeps the account's review history
(deleting and recreating the user would cascade it away):

```bash
docker compose stop
docker compose run --rm \
  -e SET_PASSWORD_USERNAME=someone \
  -e SET_PASSWORD_PASSWORD='a-strong-password' \
  app npm run set-password
docker compose start
```

An unknown username is refused with a non-zero exit code rather than
silently changing nothing; success prints `Password updated for "<username>".`

If the app must stay up (e.g. mid-incident), either script can be run with
`docker exec -e ... learn-japanese npm run create-user` (or `set-password`)
against the live container. That briefly puts a second connection on
`app.db`; since the switch to rollback-journal mode this no longer risks the
unlinked-WAL corruption described under "Backups", but the two connections
can still contend for the write lock. Prefer the `stop` / `run --rm` /
`start` sequence above whenever you can afford the few seconds of downtime.

### Rebuilding the curriculum

Changing the curriculum's shape (adding cards, renaming units, regrouping
chapters) requires a full rebuild, because `seedIfEmpty` only ever seeds an
empty database.

**This destroys all study progress.** `user_cards` and `review_logs` reference
`cards.id`, an autoincrement key a reseed does not preserve — so scheduling
state, streaks, and review history for every user are lost. Accounts and
sessions survive.

Stop the app first, so exactly one process touches `app.db`:

```
docker compose stop
cp data/app.db "data/app.db.bak-$(date +%Y%m%d%H%M%S)"
docker compose run --rm -e RESEED_CONFIRM=yes app npm run reseed
docker compose start
```

Without `RESEED_CONFIRM=yes` the script prints what it _would_ destroy and
exits 1, which is the safe way to check the row counts first.

### Backups

Stop the container, then copy the database file. The app runs SQLite in
rollback-journal (`DELETE`) mode, so a committed write is always in `app.db`
itself and there are no `-wal`/`-shm` sidecars to copy alongside it:

```bash
docker compose stop app
cp data/app.db /path/to/backup/
docker compose start app
```

Restore by stopping the container, copying the backed-up files back into
`data/`, and starting the container again.

The container runs as root (no `USER` directive, matching the operator's
other deployments on this host), so files it writes under `./data` may end
up owned by `root:root` on a Linux host — particularly if `./data` didn't
already exist before the first `docker compose up` and Compose created it.
If so, the backup/restore commands above need `sudo` to read or write those
files as a non-root operator.

**Stop the container before any ad hoc direct inspection of `app.db`** — e.g.
opening a `sqlite3` shell or a scratch `docker exec ... node` script against
it — while the app is also running.

The reason is specific to this host. `./data` is a bind mount served over
virtiofs into the Linux container. The app originally ran SQLite in WAL
mode, and WAL's shared-memory index (the `-shm` file) does not work across
that boundary: two connections each believe they are the only one. A second
process opening the database was observed, on this live deployment, to
checkpoint and unlink `app.db-wal` out from under the running app, which
then kept writing into an unlinked file — visible as
`app.db-wal (deleted)` in `/proc/1/fd`. Anything it wrote would have
vanished on the next restart.

`connect.ts` therefore uses rollback-journal (`DELETE`) mode, which needs no
shared memory and relies only on POSIX `fcntl` locks that virtiofs does
implement. Contention now surfaces as a `SQLITE_BUSY` error instead of
silent divergence, and `src/lib/server/db/connect.test.ts` fails if anything
switches the journal mode back. The app is a single synchronous
`better-sqlite3` process, so WAL's concurrent-reader benefit bought nothing
here anyway.

That makes a stray second connection far less dangerous than it was, but
still not something to do casually — one process at a time remains the rule.
If you must read the database while the app is up, open it read-only and
immutable, which takes no locks at all:

```bash
sqlite3 'file:data/app.db?immutable=1' 'select count(*) from users;'
```

This is also why `create-user` and `set-password` (above) are run with the
app stopped rather than against the live container.

### Reverse proxy and TLS

The real request path to this app is:

```
Browser --HTTPS--> Cloudflare edge --Cloudflare Tunnel--> cloudflared (on the host Mac)
       --> 127.0.0.1:8089 (Homebrew nginx on the HOST) --> 127.0.0.1:3001 (Docker app)
```

**TLS is terminated by Cloudflare at the edge.** The origin never holds a
certificate and doesn't need one. Everything downstream of Cloudflare — the
tunnel hop into `cloudflared` and the proxy hop from `cloudflared` into
nginx — is plain HTTP over localhost, which is fine because none of it
leaves the machine.

`cloudflared` runs as a Homebrew service on the host (not a container),
started with `--config ~/.cloudflared/config.yml --no-autoupdate run`.

That config maps hostnames to local ports via `ingress` rules, matched
top-to-bottom with a catch-all 404 at the end. Real tunnel ids, credential
paths, and hostnames are deliberately not reproduced here — this repo is
public, and the live values are on the host:

```yaml
tunnel: <tunnel-id>
credentials-file: ~/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: <app-hostname>
    service: http://localhost:8089
  - service: http_status:404
```

The reverse proxy itself is **Homebrew nginx running on the host** — not a
container — with site configs in `/opt/homebrew/etc/nginx/servers/`. This
app gets its own file there, `learn-japanese.conf`, listening on
`127.0.0.1:8089` (a lower port was already taken by another site on the same
host) and proxying to the app container:

```nginx
server {
    listen 127.0.0.1:8089;
    server_name <app-hostname>;

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

Every one of these ports is bound to localhost only — never exposed
publicly. Public traffic only ever reaches them via the Cloudflare Tunnel.

This config file already exists on the host and `nginx -t` passes against
it, but it is **not live yet**. Going live needs this checklist, in order:

- [ ] Reload host nginx to pick up the new server block — this is Homebrew
      nginx on the host, **not** `docker exec`:

  ```bash
  nginx -t && nginx -s reload
  ```

- [ ] Add an ingress rule for the app's hostname to
      `~/.cloudflared/config.yml`, pointing at `http://localhost:8089`,
      **above** the catch-all `- service: http_status:404` entry —
      cloudflared matches ingress rules in order and the catch-all swallows
      anything listed after it.
- [ ] Create the DNS route:

  ```bash
  cloudflared tunnel route dns <tunnel-id> <app-hostname>
  ```

- [ ] Restart the tunnel so it picks up the new config. This briefly
      interrupts every other hostname on the same tunnel, since they all
      share the one `cloudflared` process.

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
one proxy hop, also set `ORIGIN=https://<app-hostname>` in `.env` so
SvelteKit's CSRF origin check passes.

Secure cookies already work fine, and always would have: the browser's
connection to Cloudflare is HTTPS, and the `Secure` cookie attribute is
enforced by the browser against its _own_ connection scheme — the plaintext
hops behind Cloudflare are invisible to it. There is no TLS gap blocking
login; the only remaining work is the checklist above to route the hostname
to this app at all.

**The host also has an `nginx-proxy` Docker container, and it is not part of
this path.** It publishes port 80 and its `conf.d` holds only a
`default.conf` returning 404 — nothing routes through it. Don't drop a
config into that container's `conf.d/` expecting it to take effect; it
won't, because the tunnel talks to Homebrew nginx, not to this container.

Verify after deploying: once the checklist above is complete, load the app's
hostname over HTTPS — it should redirect to `/login`, a user created with
`create-user` (see "Creating users" above) should be able to
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
