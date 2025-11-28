# GIAI ĐOẠN 1: Cài đặt dependencies
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# GIAI ĐOẠN 2: Production
FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY . .

USER node

# Cổng 5003 khớp với Center Service
EXPOSE 5003

CMD ["dumb-init", "node", "server.js"]