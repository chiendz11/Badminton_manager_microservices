import dotenv from 'dotenv';
import mongoose from 'mongoose';

// 💡 SỬA LỖI IMPORT:
// Import đối tượng 'envConfig' thay vì biến 'MONGODB_URI'
import { envConfig } from './env.config.js'; 

// Chỉ tải biến môi trường nếu KHÔNG phải test
if (process.env.NODE_ENV !== 'test') { 
  dotenv.config();
}

/**
 * Hàm xóa tất cả các Models đã được đăng ký khỏi cache của Mongoose.
 * Giúp tránh lỗi "OverwriteModelError" và đảm bảo Model luôn mới trong môi trường DEV/Hot-Reload.
 */
const clearMongooseModelCache = () => {
  // Lặp qua tất cả các key (tên Models) đang có trong cache
  for (const modelName of Object.keys(mongoose.models)) {
      delete mongoose.models[modelName];
      // console.log(`[Cache] Đã xóa Model '${modelName}' khỏi cache.`);
  }
  // Lặp qua tất cả các key (tên Models) trong Schema type cache (cũng cần thiết)
  if (mongoose.modelSchemas) {
      for (const modelName of Object.keys(mongoose.modelSchemas)) {
          delete mongoose.modelSchemas[modelName];
      }
  }
  console.log("✅ Đã xóa tất cả Models khỏi cache của Mongoose.");
};


/**
 * Hàm kết nối MongoDB cho môi trường DEV/PROD.
 * Bao gồm cả logic xóa cache và cấu hình cơ bản.
 */
export const connectDB = async () => {
  if (process.env.NODE_ENV === 'test') {
    console.log("[connectDB] Bỏ qua kết nối DB trong môi trường TEST.");
    return;
  }

  try {
    // 💡 SỬA LỖI SỬ DỤNG:
    // Phải truy cập thông qua đối tượng 'envConfig'
    const MONGO_URI_DEV_PROD = envConfig.MONGODB_URI;

    if (!MONGO_URI_DEV_PROD) {
      console.error("❌ Lỗi: MONGO_URI không được định nghĩa cho DEV/PROD.");
      process.exit(1);
    }
    
    // 💡 BƯỚC MỚI: Xóa cache Model trước khi kết nối/định nghĩa lại
    clearMongooseModelCache();

    // Cấu hình Mongoose
    mongoose.set('bufferCommands', true); 
    mongoose.set('autoIndex', true);      
    
    // Kết nối
    await mongoose.connect(MONGO_URI_DEV_PROD, {
      maxPoolSize: 500,
      minPoolSize: 10,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[DEBUG] Đang kết nối tới DB:', mongoose.connection.name);
    console.log('[DEBUG] Đang kết nối tới URI:', mongoose.connection.host);
    console.log('[DEBUG] Collection có sẵn:', await mongoose.connection.db.listCollections().toArray());
    
    console.log("✅ Kết nối MongoDB thành công (DEV/PROD)!");
    
    return mongoose.connection; 
    
  } catch (error) {
    console.error("❌ Lỗi kết nối MongoDB (DEV/PROD):", error);
    process.exit(1);
  }
};

/**
 * Hàm đồng bộ hóa Index cho tất cả các Models đã được đăng ký.
 */
export const syncModelIndexes = async () => {
    if (process.env.NODE_ENV === 'test') return;
    
    const models = Object.values(mongoose.models);
    
    if (models.length === 0) {
        // CẢNH BÁO nếu không có models nào, điều này có nghĩa là Models chưa được import
        console.warn("⚠️ Không tìm thấy Models nào đã được đăng ký. Hãy đảm bảo Models đã được import trước khi gọi syncModelIndexes.");
        return;
    }
    
    for (const Model of models) {
        try {
            await Model.syncIndexes();
            console.log(`✅ Đồng bộ hóa Index cho Model '${Model.modelName}' thành công.`);
        } catch (error) {
            console.error(`❌ Lỗi khi đồng bộ hóa Index cho Model '${Model.modelName}':`, error.message);
        }
    }
};