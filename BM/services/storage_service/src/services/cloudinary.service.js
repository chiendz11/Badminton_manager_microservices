import { v2 as cloudinary } from 'cloudinary';
import { envConfig } from '../configs/env.config.js';
import streamifier from 'streamifier'; // Để xử lý buffer/stream

// -----------------------------------------------------------------
// KHỞI TẠO CLOUDINARY
// -----------------------------------------------------------------
cloudinary.config({
    cloud_name: envConfig.CLOUDINARY_CLOUD_NAME,
    api_key: envConfig.CLOUDINARY_API_KEY,
    api_secret: envConfig.CLOUDINARY_API_SECRET,
    secure: true,
});

// Định nghĩa thư mục root của ứng dụng trên Cloudinary
const CLOUDINARY_ROOT_FOLDER = 'badminton_app';

/**
 * @description Upload file (dạng Buffer) lên Cloudinary
 * @param {Buffer} fileBuffer - Dữ liệu file dưới dạng Buffer
 * @param {string} folderName - Thư mục Cloudinary (e.g., 'avatars', 'bills')
 * @param {string} publicIdToUse - (Tùy chọn) ID nghiệp vụ của bạn để dùng làm public_id trên Cloudinary
 * @returns {Promise<{publicId: string, url: string, resourceType: string, bytes: number}>} Metadata của file đã upload
 */
export const uploadFile = (fileBuffer, folderName, publicIdToUse = null) => {
    return new Promise((resolve, reject) => {
        
        // 💡 CẢI TIẾN: Xây dựng options
        const uploadOptions = {
            // Sử dụng thư mục root để đảm bảo tổ chức
            folder: `${CLOUDINARY_ROOT_FOLDER}/${folderName}`,
            resource_type: 'auto', // Cloudinary tự động xác định loại file
        };

        // 💡 Nếu cung cấp publicId, hãy sử dụng nó
        if (publicIdToUse) {
            uploadOptions.public_id = publicIdToUse;
            uploadOptions.overwrite = true; // Cho phép ghi đè nếu ID trùng
        }
        // ---------------------------------

        let uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions, // 💡 Sử dụng options đã xây dựng
            (error, result) => {
                if (error) {
                    console.error('Cloudinary Upload Error:', error);
                    return reject(new Error('Cloudinary upload failed.'));
                }
                
                // 💡 THÊM bytes (fileSize) để lưu vào DB metadata
                resolve({
                    publicId: result.public_id, // ID mà Cloudinary trả về (vd: badminton_app/avatars/FILE-uuid-123)
                    url: result.secure_url,
                    resourceType: result.resource_type,
                    bytes: result.bytes, 
                });
            }
        );
        // Dùng streamifier để chuyển buffer thành stream và đẩy lên Cloudinary
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};

/**
 * @description Xóa file khỏi Cloudinary
 * @param {string} publicId - Public ID của file cần xóa (vd: badminton_app/avatars/FILE-uuid-123)
 * @param {string} resourceType - Loại tài nguyên ('image' | 'raw' | 'video')
 * @returns {Promise<void>}
 */
export const deleteFile = async (publicId, resourceType = 'image') => {
    try {
        // Cloudinary yêu cầu resource_type khi xóa
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        
        if (result.result === 'not found') {
            console.warn(`Cloudinary: File ${publicId} not found, but proceeding.`);
            // Không ném lỗi nếu không tìm thấy, vì mục tiêu là đảm bảo nó bị xóa
            return;
        }
        console.log(`Cloudinary file destroyed: ${publicId}`);
    } catch (error) {
        console.error('Cloudinary Delete Error:', error);
        throw new Error('Cloudinary deletion failed.');
    }
};

/**
 * @description Lấy URL công khai của file dựa trên Public ID (dùng cho các file đã upload trước đó)
 * @param {string} publicId - Public ID của file
 * @param {object} options - Tùy chọn chuyển đổi (width, height, crop...)
 * @returns {string} URL công khai
 */
export const getPublicUrl = (publicId, options = {}) => {
    // Hàm này ít được dùng vì chúng ta lưu publicUrl trực tiếp
    // Nhưng vẫn hữu ích cho việc tạo URL chuyển đổi (transform)
    return cloudinary.url(publicId, options);
};

// Hàm lấy nhiều URL (ít dùng trong service này, nhưng có thể cần)
export const getBulkUrls = (publicIds) => {
    return publicIds.map(id => getPublicUrl(id));
};