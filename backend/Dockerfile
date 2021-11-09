FROM node:16-alpine

RUN mkdir -p /home/relayer/relayer-backend/chain-data 

WORKDIR /home/relayer/relayer-backend

COPY package*.json ./

RUN npm install

COPY . .

ENTRYPOINT [ "node",  "dist/index.js" ]

