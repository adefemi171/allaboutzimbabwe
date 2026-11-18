FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev --no-audit --no-fund && rm -rf .next/cache

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/package.json /app/next.config.ts ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
RUN install -d -o node -g node /app/data && touch /app/data/.keep && chown node:node /app/data/.keep
RUN node -e "const fs = require('node:fs'); const moduleApi = require('node:module'); fs.writeFileSync('next.config.mjs', moduleApi.stripTypeScriptTypes(fs.readFileSync('next.config.ts', 'utf8'))); fs.unlinkSync('next.config.ts')"
USER node
CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0"]
