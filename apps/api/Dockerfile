FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN corepack enable pnpm && pnpm install --frozen-lockfile || npm install -w api -w shared 2>/dev/null || true

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run db:generate 2>/dev/null || (cd apps/api && npx prisma generate)
RUN npm run build -w api 2>/dev/null || (cd apps/api && npm run build)

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/prisma ./prisma
RUN mkdir -p /app/uploads
EXPOSE 4000
CMD ["node", "dist/main.js"]
