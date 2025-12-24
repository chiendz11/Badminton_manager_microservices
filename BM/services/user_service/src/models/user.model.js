import mongoose from 'mongoose';
import { DEFAULT_AVATAR_FILE_ID, DEFAULT_AVATAR_URL } from '../configs/env.config.js'; // 💡 Import cấu hình môi trường

// -----------------------------------------------------------------
// Định nghĩa Schema chính: User Profile
// -----------------------------------------------------------------

// 💡 --- SỬ DỤNG GIÁ TRỊ MẶC ĐỊNH TỪ BIẾN MÔI TRƯỜNG --- 💡
// (Mô hình Hybrid: Tối ưu hiệu năng đọc)
// Không còn hardcode trong file model này nữa!

const userSchema = new mongoose.Schema({

    // 🔑 Khóa Ngoại/ID Nghiệp vụ (từ Auth Service)
    userId: {
        type: String, // Lưu UUID từ Auth Service
        required: true,
        unique: true, // Đảm bảo mỗi User Profile chỉ có một bản ghi
        index: true  // Rất quan trọng để tìm kiếm User Profile theo User ID
    },

    // 💡 --- BẢN SAO TỪ AUTH_SERVICE --- 💡
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // 💡 --- KẾT THÚC BẢN SAO --- 💡

    // Thông tin cơ bản (Source of Truth: User Service)
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone_number: {
        type: String,
        sparse: true, // Cho phép null/undefined là unique (ví dụ: đăng nhập Google)
        trim: true
    },
    role: {
        type: String,
        enum: ['USER', 'CENTER_MANAGER', 'SUPER_ADMIN'], // Khớp với Prisma Enum
        default: 'USER', 
        index: true // 💡 Cực kỳ quan trọng để query nhanh
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true // ⚠️ Bắt buộc có Index để lọc nhanh (VD: Lấy list user đang active)
    },

    // 💡 --- THÔNG TIN AVATAR (MÔ HÌNH HYBRID, DÙNG ENV CONFIG) --- 💡

    // 1. URL Công khai (Dùng để HIỂN THỊ - TỐC ĐỘ CAO)
    // user.model.js
    avatar_file_id: {
        type: String,
        default: null // Hoặc bỏ dòng này
    },
    avatar_url: {
        type: String,
        default: null
    },

    level: {
        type: String,
        enum: ['đồng', 'bạc', 'vàng', 'bạch kim', 'kim cương'],
        default: 'đồng'
    },
    points: {
        type: Number,
        default: 0
    },// --- THÊM PHẦN NÀY ---
    isSpamming: {
        type: Boolean,
        default: false,
        index: true // Để Admin lọc ra những user đang bị khóa
    },
    lastSpamTime: {
        type: Date,
        default: null
    },
    violationCount: { type: Number, default: 0 } // 👇 MỚI: Đếm số lần vi phạm
    // ---------------------

}, {
    timestamps: true,
    collection: 'users'
});


export const User = mongoose.model('User', userSchema);