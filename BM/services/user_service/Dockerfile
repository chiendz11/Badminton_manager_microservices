# GIAI ĐOẠN 1: Cài đặt dependencies
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Dùng 'npm ci' để cài đặt chính xác version trong lock-file, bỏ qua devDependencies
RUN npm ci --omit=dev

# GIAI ĐOẠN 2: Production
FROM node:22-alpine
WORKDIR /app

# Cài đặt dumb-init để quản lý process
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

# Copy node_modules đã cài từ giai đoạn builder
COPY --from=builder /app/node_modules ./node_modules

# Copy source code ứng dụng
COPY . .

# Chuyển sang user thường để bảo mật
USER node

# Cổng 8085 khớp với User Service
EXPOSE 8085

# Khởi chạy qua dumb-init
CMD ["dumb-init", "node", "server.js"]