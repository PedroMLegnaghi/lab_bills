@AGENTS.md

# lab_bills

Lab snack-purchase splitter. Spec and decisions: `docs/SPEC.md`. Commands: `README.md`.

- **Production is Vercel + Neon + a private Vercel Blob store**; every push to `main` deploys and
  `vercel-build` runs `prisma migrate deploy`. GitHub Pages was considered and cannot host this
  (static only). The Docker files are an untested self-hosting alternative — do not build them
  to test a change; the disk is near full and Docker's VM never returns space.
- **Local Postgres is `npm run db:start`** (Prisma's dev server, PGlite, no Docker). It must be
  running before `dev`, `db:migrate`, `db:mock` or the e2e run.
- **Prisma 7**: config in `prisma.config.ts` (uses `DATABASE_URL_UNPOOLED` for migrations when
  set), client generated to `src/generated/prisma` (gitignored), `@prisma/adapter-pg`.
  `migrate dev` does not generate the client — run `npx prisma generate`, and restart `next dev`
  after it (the client is cached on `globalThis`). Always call the local binary: the `prisma`
  npm `latest` tag is an 8.x RC, and a bare `npx prisma` outside the project pulls ~1.2 GB.
- **Money is integer cents.** Parse/format only through `src/lib/money.ts` (unit-tested).
- **Every Server Action calls `requireMember()`** — actions are reachable by direct POST.
- **Receipts** are typed by magic bytes and served only through `/comprovantes/[file]`.
  `src/lib/uploads.ts` picks the backend: private Blob when `BLOB_STORE_ID` or
  `BLOB_READ_WRITE_TOKEN` is set, `./uploads` otherwise. Only the disk backend is covered by the
  e2e run. Disk paths need `turbopackIgnore`, or the standalone build traces the whole project.
- **4 MB receipt cap** comes from Vercel's 4.5 MB body limit, not from taste; raising it needs
  client uploads straight to Blob.
- Verify UI changes with `npm run test:e2e` against a dev server (no browser needed).
