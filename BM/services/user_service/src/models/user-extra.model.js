import mongoose from 'mongoose';

// -----------------------------------------------------------------
// Định nghĩa Schema phụ: User Extra Info
// (Dùng để lưu thông tin mở rộng phục vụ tìm kiếm & ghép cặp)
// -----------------------------------------------------------------

const userExtraSchema = new mongoose.Schema({

    // 🔑 Khóa Ngoại: Liên kết với User chính
    userId: {
        type: String, // Khớp với userId bên bảng User
        required: true,
        unique: true, // Quan trọng: 1 User chỉ có 1 bản ghi Extra
        index: true
    },

    // 🏆 Trình độ (Filterable)
    skillLevel: {
        type: String,
        enum: ['Mới chơi', 'Trung bình', 'Khá', 'Chuyên nghiệp'],
        default: 'Trung bình',
        index: true // Đánh index để Meilisearch filter nhanh
    },

    // 🏸 Lối chơi (Filterable)
    playStyle: {
        type: String,
        enum: ['Tấn công', 'Phòng thủ', 'Toàn diện'],
        default: 'Toàn diện',
        index: true
    },

    // 📍 Khu vực hoạt động (Searchable & Filterable)
    // Lưu string text để search full-text, ví dụ: "Cầu Giấy, Hà Nội"
    location: {
        type: String,
        trim: true,
        default: '',
        index: true 
    },

    // ⏰ Thời gian rảnh (Filterable)
    // Lưu mảng các buổi rảnh: ["Sáng", "Tối", "Cuối tuần"]
    preferredTime: {
        type: [String], 
        default: [],
        index: true
    },

    // 📝 Giới thiệu bản thân (Searchable)
    // Dùng cho Full-text search tìm keyword sở thích, mô tả...
    bio: {
        type: String,
        trim: true,
        default: '',
        maxlength: 500 // Giới hạn độ dài để tối ưu lưu trữ
    }

}, {
    timestamps: true,
    collection: 'users_extra' // Tách riêng ra collection khác cho gọn DB
});

export const UserExtra = mongoose.model('UserExtra', userExtraSchema);