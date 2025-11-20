# ------------------
# Giai đoạn 1: Build (Cài đặt dependencies)
# ------------------
# Dùng image Node.js 18 (Alpine là bản siêu nhẹ)
FROM node:18-alpine AS builder

# Đặt thư mục làm việc bên trong container
WORKDIR /app

# Copy file package.json và package-lock.json
COPY package*.json ./

# Cài đặt tất cả dependencies (bao gồm devDependencies để build)
RUN npm install

# Copy toàn bộ code (thư mục src, prisma, .env...) vào
COPY . .

# 💡 Chạy Prisma Generate (Rất quan trọng cho K8s)
# Bước này để tạo Prisma Client cho môi trường Linux
RUN npx prisma generate

# ------------------
# Giai đoạn 2: Production (Chạy app)
# ------------------
# Dùng lại image Node.js 18 (hoặc một image slim hơn)
FROM node:18-alpine

WORKDIR /app

# Copy lại file package để cài đặt production
COPY package*.json ./

# 💡 Chỉ cài đặt dependencies cho production (nhẹ hơn)
RUN npm install --production

# Copy code đã build và node_modules từ giai đoạn "builder"
# Copy thư mục "dist" nếu bạn có bước build (TypeScript)
# COPY --from=builder /app/dist ./dist

# Copy code "src" nếu bạn chạy JS trực tiếp
COPY --from=builder /app/src ./src

# Copy Prisma schema và client đã được generate
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.env .env   

# Lấy cổng từ biến môi trường (mặc định là 8081)
ENV PORT=8081

# Mở cổng 8081 của container
EXPOSE 8081

# Lệnh để khởi chạy ứng dụng (thay 'src/index.js' nếu cần)
CMD [ "node", "src/server.js" ]