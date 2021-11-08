FROM node:16-alpine

WORKDIR /home/relayer/relayer-backend

COPY package*.json ./

RUN npm install

COPY . .

ENTRYPOINT [ "node",  "dist/index.js" ]

