FROM node:16 as builder
WORKDIR /usr/src/relayer-backend
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src src
RUN npm run build

FROM node:16
ENV CHAIN_CONFIG_PATH="config.json"
ENV FUNDS_ACCOUNT_SEED="//Alice"
ENV MODE="relayer"
WORKDIR /usr/src/relayer-backend
RUN mkdir -p /usr/src/relayer-backend/chain-data
COPY package*.json ./
COPY config.json ./
COPY entrypoint.sh ./
RUN npm ci
COPY --from=builder /usr/src/relayer-backend/dist/ dist/
ENTRYPOINT ["/bin/bash", "./entrypoint.sh"] 

