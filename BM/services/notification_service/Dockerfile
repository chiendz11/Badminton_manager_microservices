# ---------------------------------------
# Stage 1: Build
# ---------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy file package để cài dependency trước (tận dụng cache Docker)
COPY package*.json ./

# Cài đặt dependency (cả dev để build)
RUN npm install

# Copy toàn bộ source code
COPY . .

# Build code TypeScript sang JavaScript (vào thư mục dist)
RUN npm run build

# ---------------------------------------
# Stage 2: Run (Production)
# ---------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package.json lại để cài prod dependencies
COPY package*.json ./

# Chỉ cài dependencies cần thiết cho lúc chạy (bỏ qua devDependencies cho nhẹ)
RUN npm install --omit=dev

# Copy code đã build từ Stage 1
COPY --from=builder /app/dist ./dist

# Chạy app
CMD ["node", "dist/main.js"]