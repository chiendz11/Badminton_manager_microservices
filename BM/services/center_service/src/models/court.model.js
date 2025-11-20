// court.model.js
import mongoose from 'mongoose';

const courtSchema = new mongoose.Schema({
    // 💡 KHÓA NGOẠI: Court thuộc Center nào?
    centerId: { 
        type: String, 
        required: true, 
        index: true // Rất quan trọng để tìm kiếm nhanh
    },
    
    // 💡 ID Nghiệp vụ cho Sân con (để Booking Service sử dụng)
    courtId: { type: String, required: true, unique: true }, 

    name: { 
        type: String, 
        required: true 
    }, // Ví dụ: "Sân 1", "Sân 2"
    
    type: { 
        type: String, 
        enum: ['thảm', 'gỗ', 'xi_măng'], 
        default: 'thảm' 
    },
    
    // Trạng thái (Center Manager có thể khóa/mở sân)
    isActive: { type: Boolean, default: true } 
    
}, { timestamps: true });

// Export Court Model
export const Court = mongoose.model('Court', courtSchema);