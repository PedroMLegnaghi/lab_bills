# lab_bills — spec

Track shared snack/coffee purchases inside the research lab. A member who buys something posts
the purchase with its receipt; the others see it and chip in whatever they want, attaching proof
of payment. Deliberately small: one Next.js app, one Postgres database, one receipts store.

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Identity | Shared **lab access code** gates sign-up; each member then has name + password | Closed group, zero friction, no OAuth setup |
| Hosting | Vercel + Neon + private Vercel Blob | Pedro asked for GitHub Pages so everyone can reach it; Pages is static-only, and this keeps every feature and Prisma on a free tier |
| Database | Postgres via Prisma 7 + `@prisma/adapter-pg` (was SQLite while local-only) | Serverless functions have no persistent disk; Neon is free and Prisma's dev server gives a local Postgres without Docker |
| Receipts | Private Blob store in production, `./uploads/` locally; served only to signed-in members by a route handler | Receipts are private; a public bucket or `public/` would expose them |
| Receipt size | 4 MB cap; photos shrunk in the browser to 1600 px JPEG | Vercel refuses bodies over 4.5 MB |
| Suggested share | `ceil(total / activeMembers)`, **snapshotted** at purchase creation (`splitCount`) | A member joining later must not change what was asked of the others |
| Contributions | Count immediately, no confirmation step | Decided by Pedro |
| Money | Integer cents everywhere; BRL formatting only at the edge | No float rounding |
| Sessions | Random token in an httpOnly cookie, SHA-256 of it stored in `Session` | Revocable, no JWT secret to manage |
| Passwords | `node:crypto` scrypt with per-user salt | No native hashing dependency |

## Model

```
Member(id, name unique, passwordHash, pixKey?, active, createdAt)
Session(id, tokenHash unique, memberId, expiresAt)
Purchase(id, buyerId, description, amountCents, purchasedAt, receiptFile, splitCount, createdAt)
Contribution(id, purchaseId, memberId, amountCents, receiptFile?, note?, createdAt)
```

- The buyer is one of the `splitCount` shares, so the amount to collect from others is
  `amountCents − suggestedShare`. The buyer cannot contribute to their own purchase.
- A member may contribute more than once to the same purchase (e.g. paid in two parts).
- Receipt required on a purchase, optional on a contribution (cash happens).
- `pixKey` is optional, set at sign-up or later on `/membros`, and shown with a copy button
  above the contribution form of that member's purchases. Free text up to 77 chars (the longest
  Pix key, an e-mail); not validated by type — Pix rejects a wrong key at payment time.
  Visible to every signed-in member, never to anonymous visitors.

## Screens (mobile first)

| Route | Content |
|---|---|
| `/entrar` | Name + password |
| `/cadastro` | Lab code + name + password |
| `/` | Purchases, newest first: buyer, total, progress, "your share", whether you already paid |
| `/compras/nova` | Description, amount, date, receipt photo |
| `/compras/[id]` | Receipt, contributions list, contribute form pre-filled with the suggestion |
| `/resumo` | Per member: spent, received, contributed; your own balance |
| `/membros` | Members and the active flag (who counts in the split) |

## Out of scope (for now)

Payments integration (Pix API), notifications, editing a purchase after others contributed,
roles/admins.
