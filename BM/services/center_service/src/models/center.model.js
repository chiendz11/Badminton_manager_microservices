import mongoose from 'mongoose';
import { envConfig } from '../configs/env.config.js';

const centerSchema = new mongoose.Schema({
    // --- ĐỊNH DANH & QUẢN LÝ ---
    centerId: { type: String, required: true, unique: true, index: true }, 
    centerManagerId: { type: String, required: true, index: true }, 

    // --- THÔNG TIN CƠ BẢN ---
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    phone: { type: String, required: true }, // BEST PRACTICE: Giữ lại vì truy cập thường xuyên
    description: { type: String }, 
    
    // --- VỊ TRÍ ---
    // ❌ Đã bỏ trường 'location' (GeoJSON) theo yêu cầu
    googleMapUrl: { type: String }, // Chỉ giữ lại link URL Google Map

    // --- MEDIA ---
    logo_file_id: { 
        type: String, 
        required: true, 
        default: envConfig.DEFAULT_LOGO_FILE_ID 
    },
    image_file_ids: [{ type: String }], 

    // --- CẤU HÌNH & THỐNG KÊ ---
    totalCourts: { type: Number, default: 0 },
    facilities: [{ type: String }], 
    avgRating: { type: Number, default: 5.0 },
    bookingCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    // --- GIÁ CẢ ---
    pricing: {
        weekday: [{
            startTime: String, 
            endTime: String,   
            price: Number
        }],
        weekend: [{
            startTime: String,
            endTime: String,
            price: Number
        }]
    },
}, {
    timestamps: true,
    collection: 'centers'
});

export const Center = mongoose.model('Center', centerSchema);