// Backend/config/Mongodb.js
import dotenv from 'dotenv';
import { DB_URI } from './env.config';
if (process.env.NODE_ENV !== 'test') { // Chỉ tải biến môi trường nếu KHÔNG phải test
  dotenv.config();
}

import mongoose from 'mongoose';

const connectDB = async () => {
  // Hàm này chỉ nên được gọi khi ứng dụng chạy trong môi trường dev/prod.
  // Trong môi trường test, globalSetup sẽ quản lý kết nối DB trực tiếp qua db.js.
  if (process.env.NODE_ENV === 'test') {
    console.log("[connectDB] Bỏ qua kết nối DB từ Backend/config/Mongodb.js trong môi trường TEST.");
    // Đảm bảo không ném lỗi nếu không có MONGO_URI cho dev/prod,
    // vì nó sẽ không được sử dụng trong môi trường test này.
    return;
  }

  try {
    const MONGO_URI_DEV_PROD = DB_URI

    if (!MONGO_URI_DEV_PROD) {
      console.error("❌ Lỗi: MONGO_URI không được định nghĩa cho môi trường DEV/PROD.");
      process.exit(1);
    }

    mongoose.set('bufferCommands', true);
    mongoose.set('autoIndex', true);
    console.log("Mongoose: Đã cấu hình cho môi trường DEV/PROD.");

    await mongoose.connect(MONGO_URI_DEV_PROD, {
      maxPoolSize: 500,
      minPoolSize: 10,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ Kết nối MongoDB thành công (DEV/PROD)!");
  } catch (error) {
    console.error("❌ Lỗi kết nối MongoDB (DEV/PROD):", error);
    process.exit(1);
  }
};

export default connectDB;