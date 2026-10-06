# Caixinha do Lab (lab_bills)

Shared snack/coffee purchases for the research lab. Whoever buys posts the purchase with its
receipt; everyone else sees it, gets a suggested share (total ÷ active members) and chips in
whatever they want, attaching proof of payment. Mobile first.

Next.js 16 (App Router, Server Actions) · Prisma 7 + Postgres · Tailwind 4. Hosted on Vercel with
Neon (database) and a private Vercel Blob store (receipts). Design decisions in
[docs/SPEC.md](docs/SPEC.md).

## Development

```bash
cp .env.example .env        # set LAB_ACCESS_CODE
npm install                 # also runs `prisma generate`
npm run db:start            # local Postgres (Prisma's dev server — no Docker); prints its URL
npm run db:migrate          # apply migrations
npm run db:mock -- --yes    # optional: wipe and create two test members (Ana/Bruno Teste, senha123)
npm run dev                 # http://localhost:3000
```

If `db:start` prints a URL different from the one in `.env.example`, put it in `.env`.
From a phone on the same network: `npm run dev -- -H 0.0.0.0`, then `http://<your IP>:3000`.

| Command | |
|---|---|
| `npm test` | Unit tests (money parsing, split rules) |
| `npm run typecheck` · `npm run lint` | |
| `npm run test:e2e` | No-JS end-to-end run against a **running** server (`E2E_BASE`, `LAB_ACCESS_CODE`). Creates members and purchases — local database only |
| `npm run db:migrate` | After editing `prisma/schema.prisma`; commit the new folder in `prisma/migrations` |
| `npm run db:stop` | Stop the local Postgres |

Receipts are stored in `./uploads` locally and never under `public/`.

## Deploying (Vercel)

GitHub Pages cannot host this app: it serves static files only, and the app needs a server for
login, the database and receipt uploads. Vercel deploys from the same GitHub repository.

One-time setup:

1. Push this repository to GitHub.
2. On vercel.com: **Add New → Project**, import the repository. Framework is detected as Next.js.
3. In the project's **Storage** tab:
   - **Create → Neon** (Postgres). Connecting it sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
   - **Create → Blob**, access **Private**. Connecting it sets `BLOB_STORE_ID`.
4. In **Settings → Environment Variables**, add `LAB_ACCESS_CODE`.
5. Redeploy. The build runs `vercel-build`, which applies pending migrations and then builds.

After that every push to `main` deploys. The app is at `https://<project>.vercel.app`.

Limits worth knowing: Vercel refuses request bodies over 4.5 MB, so receipts are capped at 4 MB.
Photos are shrunk in the browser before upload (`src/lib/shrink-image.ts`), which keeps them
far below that; a large PDF is the only thing likely to hit the cap.

## Self-hosting (Docker)

`Dockerfile` and `docker-compose.yml` run the app with its own Postgres container and receipts on
a volume. They have **not been built or tested** since the move from SQLite to Postgres.
