// services/auth_service/src/prisma.js

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
    // Bạn có thể thêm các tùy chọn log nếu muốn xem các truy vấn DB
    // log: ['query', 'info', 'warn', 'error'],
});

/**
 * Hàm kiểm tra kết nối database ngay sau khi khởi tạo Prisma Client.
 */
async function connectAndLog() {
    try {
        // Thực hiện truy vấn nhẹ nhất để buộc Prisma mở kết nối
        await prisma.$queryRaw`SELECT 1`; 
        console.log("-------------------------------------------------");
        console.log("⚡️ Prisma: Kết nối Database (Supabase) thành công!");
        console.log("-------------------------------------------------");
    } catch (error) {
        // Lỗi thường xảy ra nếu DATABASE_URL sai hoặc DB không hoạt động
        console.error("-------------------------------------------------");
        console.error("❌ Prisma: LỖI KẾT NỐI DATABASE!");
        console.error("❌ Kiểm tra biến DATABASE_URL và trạng thái Supabase.");
        console.error(error.message);
        console.error("-------------------------------------------------");
        // Quan trọng: Thoát ứng dụng nếu kết nối DB thất bại ngay từ đầu
        process.exit(1); 
    }
}

// Gọi hàm kiểm tra ngay lập tức (không cần chờ đợi)
connectAndLog();

export default prisma;