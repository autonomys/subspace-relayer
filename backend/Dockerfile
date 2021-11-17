# Install dependencies
FROM node:16 as dependencies

WORKDIR /app

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm ci

# Prune dependencies
FROM dependencies as prune

RUN npm prune --production

# Build
FROM dependencies as build

COPY tsconfig.json tsconfig.json
COPY src src

RUN npm run build

# Release
FROM node:16

COPY --from=prune /app/node_modules /node_modules
COPY --from=build /app/dist /dist
COPY entrypoint.sh /entrypoint.sh

USER nobody:nogroup

ENTRYPOINT ["/entrypoint.sh"]
