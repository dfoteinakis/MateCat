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
3. Make sure that `.env` has your RapidAPI key and your LexiQA values.

## Start the stack

Run this command from `docker-local`:

```bash
docker compose up --build
```

The first run is slow. It builds the PHP image, installs the Composer packages, and builds the
frontend. This takes several minutes. Later runs are fast.

When the log shows `starting Apache`, open http://localhost:8080.

To stop the stack, press Ctrl+C. To remove the containers, run `docker compose down`.

## What the first run does

The `app` container runs `entrypoint-app.sh`. This script does the steps below:

- It writes `inc/config.ini` from the environment values.
- It seeds `inc/oauth_config.ini` and `inc/task_manager_config.ini` from the samples.
- It runs `composer install`.
- It runs `yarn install` and `yarn build:dev`.
- It starts Apache.

Note: The script regenerates `inc/config.ini` on every start. To change a value, edit
`docker-local/.env`, not `inc/config.ini`.

## LexiQA integration

MateCat does not proxy LexiQA. The browser calls the LexiQA server directly. The PHP app only
sends the server URL and the partner id to the page.

The stack sets these values from `.env`:

| Key | Value | Meaning |
|---|---|---|
| `LXQ_LICENSE` | `bbbbbbbb` | Local licence. It turns the feature on. |
| `LXQ_PARTNERID` | `matecat` | Partner id for localhost. |
| `LXQ_SERVER` | `http://localhost:8181` | URL of the local LexiQA server. |

CAUTION: The feature is off when `LXQ_LICENSE` is empty. The page then receives an empty server
URL.

To run the LexiQA server, do the steps below:

1. Open a second terminal in `../lexiqa_new`.
2. Copy `.env.example` to `.env`. Set the values.
3. Run `npm install`.
4. Run `npm start`. The server listens on port 8181.
5. In the LexiQA server, allow the origin `http://localhost:8080` for CORS.

The browser calls endpoints such as `http://localhost:8181/matecaterrors`. If CORS blocks the
origin, the browser rejects the response.

## Edit the code

The repository is mounted into the containers. Edits on your machine appear inside the
containers.

- If you change PHP, refresh the page.
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
- Google login needs real OAuth keys in `inc/oauth_config.ini`. Anonymous project creation works
  without them.
- The notification server (`sse`) is best-effort. The LexiQA calls do not need it.
- The ActiveMQ image tag is `apache/activemq-classic:5.18.3`. If the pull fails, change the tag
  in `compose.yml`.

## Security

The `.env` file holds secrets. It is gitignored. Never commit it. Never copy its values into
tracked files.
