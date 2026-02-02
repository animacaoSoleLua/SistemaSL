FROM node:20-bullseye-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.build.json tsconfig.json ./
COPY src ./src

RUN npx prisma generate

ENV NODE_ENV=development
ENV HOST=0.0.0.0
ENV PORT=3001

EXPOSE 3001

CMD ["npm", "run", "dev"]
