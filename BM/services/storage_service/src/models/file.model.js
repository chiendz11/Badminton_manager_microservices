import mongoose from 'mongoose';

// -----------------------------------------------------------------
// Định nghĩa Schema Metadata File
// -----------------------------------------------------------------

const fileSchema = new mongoose.Schema({
    
    // 💡 ID Nghiệp vụ Công khai (Public Business ID)
    // ID này sẽ được tạo trong Controller (ví dụ: FILE-uuidv4())
    publicFileId: {
        type: String, 
        required: true,
        unique: true,
        index: true
    },
    
    // ID người dùng (hoặc service) đã tạo/upload file này
    uploaderId: {
        type: String, 
        required: true,
        index: true
    },
    // Service nào đã yêu cầu upload (ví dụ: 'user-service', 'billing-service')
    uploaderService: {
        type: String,
        required: true,
        index: true,
    },
    // Loại dữ liệu mà file này đại diện (ví dụ: 'avatar', 'bill_invoice', 'center_logo')
    fileType: {
        type: String,
        required: true,
        enum: ['avatar', 'bill_invoice', 'center_logo', 'court_image', 'other'],
    },
    // Dữ liệu từ Cloudinary
    cloudinaryPublicId: {
        type: String,
        required: true,
        unique: true, // Đảm bảo không trùng lặp
        index: true
    },
    // URL công khai của file
    publicUrl: {
        type: String,
        required: true,
    },
    // Loại tài nguyên (image, video, raw)
    resourceType: {
        type: String,
        required: true,
    },
    // Kích thước file (bytes)
    fileSize: {
        type: Number,
        default: 0
    },
    // MIME type (ví dụ: image/png)
    mimeType: {
        type: String,
    },
    // Các tag/nhãn (dùng cho AI hoặc tìm kiếm)
    tags: [{ type: String }],
    
}, {
    timestamps: true,
    collection: 'file_metadata'
});

export const FileMetadata = mongoose.model('FileMetadata', fileSchema);