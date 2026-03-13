# =============================================
# Lotio Frontend — Production Dockerfile
# Multi-stage build for Nuxt SSR (pnpm monorepo)
# =============================================

# -- Stage 1: Base image with pnpm ----------------------------------------
FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app

# -- Stage 2: Install ALL dependencies ------------------------------------
FROM base AS deps

# Copy workspace root configs
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all workspace package.json files (needed for lockfile validation)
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/

RUN pnpm install --frozen-lockfile

# -- Stage 3: Build -------------------------------------------------------
FROM deps AS build

COPY tsconfig.base.json ./
COPY apps/frontend/ apps/frontend/

# Build-time public env vars (baked into the client bundle)
ARG NUXT_PUBLIC_API_BASE=https://lotio.com.br
ARG NUXT_PUBLIC_SITE_URL=https://www.lotio.com.br
ARG NUXT_PUBLIC_FB_APP_ID=""

ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE
ENV NUXT_PUBLIC_SITE_URL=$NUXT_PUBLIC_SITE_URL
ENV NUXT_PUBLIC_FB_APP_ID=$NUXT_PUBLIC_FB_APP_ID

WORKDIR /app/apps/frontend
RUN pnpm run build

# -- Stage 4: Minimal production runner -----------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Copy only the built Nitro server output
COPY --from=build /app/apps/frontend/.output ./.output

ENV NODE_ENV=production
# Nuxt/Nitro respects HOST and PORT
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
