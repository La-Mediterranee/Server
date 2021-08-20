# --------------> The build image
FROM node:16.6.1-alpine as ts-compiler
WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig*.json ./

RUN npm ci
COPY . ./
RUN npm run build

FROM node:16.6.1-alpine as ts-remover
WORKDIR /usr/app
COPY --from=ts-compiler /usr/app/package*.json ./
COPY --from=ts-compiler /usr/app/dist ./
RUN npm ci --only=production

# --------------> The production image
FROM node:16.6.1-alpine@sha256:53ebfa5e6df1e458b47f677cb4f6fd3cf1d079083647dc40d182910a57b5a63d
WORKDIR /usr/src/app
USER node
ENV NODE_ENV=production

RUN apk add dumb-init

COPY package*.json ./
RUN npm ci --only=production

# Copy local code to the container image.
# COPY . ./
COPY --chown=node:node . /usr/src/app

# Run the web service on container startup.
CMD ["dumb-init", "node", "dist/index.js" ]
