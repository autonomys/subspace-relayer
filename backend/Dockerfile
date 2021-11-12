# Stage 1
# dependencies
FROM node:16 as dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2
# prune 
FROM dependencies as prune
RUN npm prune --production

# Stage 3
# build
FROM dependencies as build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 4
# release
FROM node:16 
COPY --from=build /app/dist ./dist
COPY --from=prune /app/node_modules ./node_modules
COPY entrypoint.sh ./
ENTRYPOINT ["/bin/bash", "./entrypoint.sh"] 
