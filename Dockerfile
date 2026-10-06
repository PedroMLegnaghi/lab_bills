# Self-hosting alternative to Vercel (see README). Not built or tested since the move to
# Postgres — treat as a starting point. Needs DATABASE_URL at runtime (docker-compose.yml).

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# postinstall runs `prisma generate`, which needs the schema copied above.
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# Migrations only need the Prisma CLI, not the app's dev dependencies.
FROM node:22-slim AS migrator
WORKDIR /opt/migrate
RUN npm init -y >/dev/null && npm install --omit=dev prisma@7.10.0 dotenv@18.0.4 && npm cache clean --force
COPY prisma.config.ts ./
COPY prisma ./prisma

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOADS_DIR=/app/uploads
COPY --from=migrator /opt/migrate /opt/migrate
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
VOLUME ["/app/uploads"]
# Apply pending migrations, then serve. Safe on every start: already-applied ones are skipped.
CMD ["sh", "-c", "cd /opt/migrate && ./node_modules/.bin/prisma migrate deploy && cd /app && exec node server.js"]
