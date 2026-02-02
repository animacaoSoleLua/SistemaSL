FROM node:20-bullseye-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY next.config.mjs tsconfig.json next-env.d.ts ./
COPY app ./app
COPY assets ./assets
COPY lib ./lib

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npx", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
