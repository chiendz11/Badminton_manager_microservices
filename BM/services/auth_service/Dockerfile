# ----------------------------------------------------
# GIAI ĐOẠN 1: DEPS (Cài dependencies đầy đủ để build)
# ----------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Cài đặt TOÀN BỘ gói (cả devDependencies) để có thể chạy lệnh prisma generate
RUN npm ci

# ----------------------------------------------------
# GIAI ĐOẠN 2: BUILDER (Generate Prisma Client)
# ----------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 💡 Tạo Prisma Client (File sẽ được tạo trong node_modules/.prisma)
RUN npx prisma generate

# ----------------------------------------------------
# GIAI ĐOẠN 3: RUNNER (Production)
# ----------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

# Cài đặt openssl và dumb-init
RUN apk add --no-cache openssl dumb-init

ENV NODE_ENV=production

# 1. Copy package.json
COPY package*.json ./

# 2. Cài đặt dependencies production (để có các gói khác ngoài prisma)
RUN npm ci --omit=dev

# 3. COPY QUAN TRỌNG ĐÃ SỬA:
# Copy thư mục @prisma (chứa định nghĩa)
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# 💡 FIX LỖI: Copy thư mục .prisma (chứa Client thật và Binary engine đã generate)
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