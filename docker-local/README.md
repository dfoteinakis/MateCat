# MateCat local stack (Docker Compose)

This directory runs the MateCat fork on your machine with Docker Compose. It starts MySQL,
Redis, ActiveMQ, the PHP web app, the Node notification server, and the analysis workers. It
also connects MateCat to your local LexiQA server for integration work.

Secrets stay in `docker-local/.env`. This file is gitignored. Do not commit it.

## Services and ports

| Service | Purpose | Host port |
|---|---|---|
| `app` | PHP web app (Apache) | http://localhost:8080 |
| `db` | MySQL 8.0 | 13306 |
| `redis` | Cache | 16379 |
| `amq` | ActiveMQ — STOMP, WebSocket, console | 61613, 61614, 8161 |
| `sse` | Node notification server | 7788 |
| `worker` | Analysis daemons (`FastAnalysis`, `TmAnalysis`) | — |

The ActiveMQ console is at http://localhost:8161 (admin/admin).

## Before you start

1. Install Docker Desktop. Start it.
2. Open a terminal in this directory (`docker-local`).
3. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

4. In `.env`, set `FILTERS_RAPIDAPI_KEY` to your RapidAPI key. The LexiQA values are optional. See
   [LexiQA integration (optional)](#lexiqa-integration-optional).

## Start the stack

Run this command from `docker-local`:

```bash
docker compose up --build
```

The first run is slow. It builds the PHP image, installs the Composer packages, and builds the
frontend. This takes several minutes. Later runs are fast.

When the log shows `starting Apache`, open http://localhost:8080.

To stop the stack, press Ctrl+C. To remove the containers, run `docker compose down`.

## Log in

Google login does not work locally, because the stack writes placeholder OAuth keys. Create a
local user with an email and a password instead.

Run this command from `docker-local` while the stack runs:

```bash
docker compose exec app php docker-local/create-user.php you@example.local yourpassword First Last
```

All four arguments are optional. Without them, the script creates `test@matecat.local` with the
password `test1234`. Then log in at http://localhost:8080 with that email and password.

The script also creates the "Personal" team of the user. Without that team, the new-project form
does not load. If you run the script again for the same email, it resets the password.

## What the first run does

The `app` container runs `entrypoint-app.sh`. This script does the steps below:

- It writes `inc/config.ini` from the environment values.
- It seeds `inc/oauth_config.ini` and `inc/task_manager_config.ini` from the samples.
- It runs `composer install`.
- It runs `yarn install` and `yarn build:dev`.
- It starts Apache.

Note: The script regenerates `inc/config.ini` on every start. To change a value, edit
`docker-local/.env`, not `inc/config.ini`.

## LexiQA integration (optional)

Note: LexiQA is optional. MateCat runs without it. When `LXQ_LICENSE` is empty, the feature is off
and MateCat does not call LexiQA. If you do not work on the LexiQA integration, skip this section.

For QA checks, the browser calls the LexiQA server directly. MateCat does not proxy these calls.
The PHP app sends the server URL and the partner id to the page.

The stack sets these values from `.env`:

| Key | Value | Meaning |
|---|---|---|
| `LXQ_LICENSE` | `bbbbbbbb` | Local licence. It turns the feature on. |
| `LXQ_PARTNERID` | `matecat` | Partner id for localhost. |
| `LXQ_SERVER` | `http://localhost:8181` | LexiQA URL for the browser. |
| `LXQ_SERVER_INTERNAL` | `http://host.docker.internal:8181` | LexiQA URL for server-to-server calls from the containers. In a container, `localhost` is the container itself. |
| `LXQ_API_USER` | `matecat` | User for server-to-server calls (HTTP Basic Auth). |
| `LXQ_API_KEY` | (from LexiQA) | Key for that user: the `key` of the `matecat` entry in `apiKeys` in the LexiQA `server_config.js`. |

To run the LexiQA server, do the steps below:

1. Open a second terminal in `../lexiqa_new`. Use the `modernize_stack` branch. It has the Docker
   setup.
2. In `server_config.js`, make sure that these entries exist:
   - In `licenses`: `'localhost:8080': 'bbbbbbbb'`. The MateCat page runs on `localhost:8080`, and
     LexiQA needs a licence entry for it.
   - In `urlToPartnerIdMap`: `localhost: 'matecat'`.
   - In `apiKeys`: a `matecat` entry with `ip: ''` and `partnerIds: ['matecat']`.
3. Start the server:

   ```bash
   docker compose -f docker/docker-compose.yml up -d --build
   ```

   The server listens on port 8181. For details, see `lexiqa_new/docker/README.md`.
4. If you change `server_config.js` later, run the same command again. The file is part of the
   image, so a restart alone does not apply the change.

LexiQA allows all origins for CORS, so you do not need a CORS change.

## Edit the code

The repository is mounted into the containers. Edits on your machine appear inside the
containers.

- If you change PHP that the web app runs (controllers, views), refresh the page.
- If you change PHP that the workers run, run `docker compose restart worker`. This applies to
  project creation (`ProjectManager`), analysis, and the queue workers. The workers are
  long-running PHP processes. They load each class once at start and do not see later edits.
- If you change frontend files, run `docker compose exec app yarn build:dev`.
- For fast frontend feedback, run `docker compose exec app yarn watch`.

## Common commands

| Task | Command |
|---|---|
| Follow the app log | `docker compose logs -f app` |
| Open a shell in the app | `docker compose exec app bash` |
| Rebuild the frontend | `docker compose exec app yarn build:dev` |
| Restart the workers | `docker compose restart worker` |
| Stop everything | `docker compose down` |
| Reset the database | `docker compose down -v`, then `docker compose up --build` |

CAUTION: `docker compose down -v` erases the database volume. You lose all local projects.

## Limits and notes

- The online install guide lists PHP 7.4. The current code needs PHP 8.3. This stack uses 8.3.
- File conversion needs the RapidAPI filters service. Set `FILTERS_RAPIDAPI_KEY` in `.env`.
- Google login needs real OAuth keys in `inc/oauth_config.ini`. Without them, log in with a local
  user (see [Log in](#log-in)). Anonymous project creation works without them.
- The notification server (`sse`) is best-effort. The LexiQA calls do not need it.
- The ActiveMQ image tag is `apache/activemq-classic:5.18.3`. If the pull fails, change the tag
  in `compose.yml`.

## Security

The `.env` file holds secrets. It is gitignored. Never commit it. Never copy its values into
tracked files.
