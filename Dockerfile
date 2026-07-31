FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
# better-sqlite3 ships prebuilt binaries baked into the npm package itself
# (no install-time download), and prefers them over anything compiled
# locally. Those prebuilds are linked against a newer glibc than
# node:22-slim (Debian bookworm) ships, so they fail to load at runtime
# (ERR_DLOPEN_FAILED) even though `npm ci` succeeds. Compile a binary that
# actually matches this image's glibc, then remove the bundled prebuilds so
# better-sqlite3's own loader falls back to the one we just built.
RUN npm install --global node-gyp \
  && cd node_modules/better-sqlite3 && node-gyp rebuild --release --force_build=1 \
  && rm -rf prebuilds

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3001 HOST=0.0.0.0 DATA_DIR=/app/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./package.json
EXPOSE 3001
CMD ["node", "build/index.js"]
