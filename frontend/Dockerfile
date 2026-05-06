# syntax=docker/dockerfile:1
FROM node:20-bullseye-slim

WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY next.config.mjs tsconfig.json next-env.d.ts ./
COPY app ./app
COPY assets ./assets
COPY components ./components
COPY lib ./lib

RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npx", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
