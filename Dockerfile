# syntax=docker/dockerfile:1

# Node 25+ no longer bundles corepack, so install it to get the pinned yarn.
FROM node:26-alpine AS base
RUN npm install -g corepack@latest && corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The real snapshots are gitignored and excluded from the build context; ship
# the samples as defaults so the paths exist. compose.yaml mounts the real ones.
RUN cp public/steam_games.sample.json public/steam_games.json \
 && cp public/launch_reference.sample.json public/launch_reference.json \
 && yarn build

FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3123 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3123
CMD ["node", "server.js"]
