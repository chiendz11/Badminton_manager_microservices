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
 * @param {string} uploadFolder - Thư mục Cloudinary con, sẽ được nối vào CLOUDINARY_ROOT_FOLDER (e.g., 'uploaderId/entityId')
 * @param {string} publicIdToUse - ID nghiệp vụ để dùng làm public_id trên Cloudinary (vd: 'FILE-UUID')
 * @returns {Promise<{publicId: string, url: string, resourceType: string, bytes: number}>} Metadata của file đã upload
 */
export const uploadFile = (fileBuffer, uploadFolder, publicIdToUse) => {
    return new Promise((resolve, reject) => {
        
        // 1. Xây dựng đường dẫn folder đầy đủ
        // Sẽ tạo ra folder: badminton_app/uploaderId/entityId
        const folder = `${CLOUDINARY_ROOT_FOLDER}/${uploadFolder}`;
        
        // 2. Xây dựng options
        const uploadOptions = {
            folder: folder, // Thư mục lưu trữ trên Cloudinary
            public_id: publicIdToUse, // Tên file cuối cùng (sẽ là folder/publicIdToUse)
            unique_filename: false, // Vì đã cung cấp public_id
            overwrite: true, // Cho phép ghi đè (tốt nhất cho ID nghiệp vụ)
            resource_type: 'auto', // Tự động xác định loại tài nguyên
            tags: ['badminton-app'], // Thêm tag mặc định
        };
        
        // 3. Thực hiện upload
        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (result) {
                    resolve({
                        // publicId là 'badminton_app/uploaderId/entityId/FILE-UUID'
                        publicId: result.public_id, 
                        url: result.secure_url,
                        resourceType: result.resource_type,
                        bytes: result.bytes,
                    });
                } else {
                    reject(error);
                }
            }
        );

        // Đẩy buffer vào stream upload
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};

/**
 * @description Xóa file trên Cloudinary bằng Public ID
 * @param {string} publicId - Public ID đầy đủ của file (ví dụ: 'badminton_app/uploaderId/entityId/FILE-UUID')
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

export const getBulkUrls = (publicIds) => {
    return publicIds.map(id => getPublicUrl(id));
};