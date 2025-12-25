# ----------------------------------------------------
# GIAI ĐOẠN 1: DEPS (Cài dependencies đầy đủ để build)
# ----------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Cài đặt TOÀN BỘ gói (cả devDependencies)
RUN npm ci

# ----------------------------------------------------
# GIAI ĐOẠN 2: BUILDER (Generate Prisma Client)
# ----------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# 🔥 [FIX QUAN TRỌNG]: Cài openssl NGAY TẠI ĐÂY để tải Prisma Engine
RUN apk add --no-cache openssl ca-certificates

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 💡 Bây giờ lệnh này sẽ chạy mượt mà vì đã có openssl
RUN npx prisma generate

# ----------------------------------------------------
# GIAI ĐOẠN 3: RUNNER (Production)
# ----------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

# Cài đặt openssl và dumb-init cho môi trường chạy
RUN apk add --no-cache openssl dumb-init

ENV NODE_ENV=production

# 1. Copy package.json
COPY package*.json ./

# 2. Cài đặt dependencies production
RUN npm ci --omit=dev

# 3. COPY QUAN TRỌNG:
# Copy thư mục @prisma (chứa định nghĩa)
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Copy thư mục .prisma (chứa Client thật và Binary engine đã generate)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy thư mục prisma (chứa schema)
COPY --from=builder /app/prisma ./prisma

# Copy source code
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.js ./

# Chuyển user
USER node

EXPOSE 8081

CMD ["dumb-init", "node", "server.js"]