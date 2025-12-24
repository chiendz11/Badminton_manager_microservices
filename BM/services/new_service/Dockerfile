# News Service
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY . .

USER node
EXPOSE 8088

CMD ["dumb-init", "node", "server.js"]
