import { FileMetadata } from '../models/file.model.js';
import { uploadFile as uploadFileToCloudinary, deleteFile as deleteFileByPublicId } from './cloudinary.service.js';
import { v4 as uuidv4 } from 'uuid'; 
import mongoose from 'mongoose';

/**
 * @description Upload file lên Cloudinary và lưu metadata vào DB
 * @param {Buffer} fileBuffer Dữ liệu file (buffer)
 * @param {string} uploaderId ID của người dùng hoặc thực thể upload
 * @param {string} uploaderService Tên service gọi upload (từ internalAuth)
 * @param {string} fileType Loại file (ví dụ: 'avatar', 'center_logo')
 * @param {string[]} tags Danh sách các tag
 * @param {string} [entityId] ID của thực thể liên quan (ví dụ: centerId)
 * @returns {Promise<object>} Đối tượng metadata file đã lưu
 */
export const saveNewFileMetadata = async ({ fileBuffer, uploaderId, uploaderService, fileType, tags, entityId }) => {
    
    // 1. Tạo Public ID Nghiệp vụ
    const publicFileId = `FILE-${uuidv4()}`;

    // 2. Xây dựng đường dẫn folder trên Cloudinary
    let uploadFolder;
    
    // 💡 Tối ưu hóa: Sử dụng uploaderService làm gốc, và entityId (hoặc uploaderId nếu không có entityId) để phân chia
    if (entityId) {
        // Cấu trúc Best Practice: service/entityId
        uploadFolder = `${uploaderService}/${entityId}`;
    } else {
        // Cấu trúc dự phòng: service/uploaderId (cho các file chung không gắn với entity cụ thể)
        uploadFolder = `${uploaderService}/${uploaderId}`;
    }
    
    // 3. Upload lên Cloudinary
    // Cloudinary Public ID sẽ là: <Cloudinary_Folder_Gốc>/<uploadFolder>/<publicFileId>
    // Ví dụ: badminton_app/CENTER_SERVICE/C001/FILE-UUID
    const cloudinaryResult = await uploadFileToCloudinary(fileBuffer, uploadFolder, publicFileId);

    // 4. Tạo và lưu bản ghi Metadata
    const newMetadata = new FileMetadata({
        publicFileId,
        uploaderId,
        uploaderService,
        fileType,
        entityId: entityId || null, // Lưu entityId (CenterId/UserId...) vào metadata
        cloudinaryPublicId: cloudinaryResult.publicId,
        publicUrl: cloudinaryResult.url,
        resourceType: cloudinaryResult.resourceType,
        bytes: cloudinaryResult.bytes, // Đổi từ bytes sang fileSize nếu cần
        fileSize: cloudinaryResult.bytes, // Tên trường trong schema là fileSize
        mimeType: cloudinaryResult.format, // Giả định Cloudinary trả về format có thể dùng làm mimeType
        tags: tags,
    });
    
    await newMetadata.save();
    
    // Trả về đối tượng đã lưu
    return newMetadata.toObject();
};

/**
 * @description Xóa file trên Cloudinary và metadata trong DB bằng Internal ID HOẶC Public ID
 * @param {string} fileId Internal DB _id HOẶC publicFileId
 * @returns {Promise<boolean>} true nếu xóa thành công, false nếu có cảnh báo/lỗi nhẹ
 */
export const deleteFileAndMetadata = async (fileId) => {
    let metadata;
    // 1. Thử tìm kiếm bằng _id MongoDB
    if (mongoose.Types.ObjectId.isValid(fileId)) {
         metadata = await FileMetadata.findById(fileId).select('cloudinaryPublicId resourceType');
    }
    
    // 2. Nếu không tìm thấy, thử tìm bằng publicFileId
    if (!metadata) {
        metadata = await FileMetadata.findOne({ publicFileId: fileId }).select('cloudinaryPublicId resourceType');
    }

    if (!metadata) {
        // Có thể fileId đã bị xóa hoặc không tồn tại, coi như thành công
        console.warn(`[FileService] Metadata for ID ${fileId} not found, proceeding with soft success.`);
        return false; 
    }

    const { cloudinaryPublicId, resourceType } = metadata;
    
    // 3. Xóa trên Cloudinary
    if (cloudinaryPublicId) {
        try {
            // Không ném lỗi nếu Cloudinary báo 'not found'
            await deleteFileByPublicId(cloudinaryPublicId, resourceType);
        } catch (error) {
            console.error(`[FileService] Failed to delete file ${cloudinaryPublicId} from Cloudinary: ${error.message}`);
            // Chúng ta vẫn cố gắng xóa metadata khỏi DB
        }
    }
    
    // 4. Xóa Metadata khỏi DB
    const result = await FileMetadata.deleteOne({ _id: metadata._id });
    
    return result.deletedCount > 0;
};

/**
 * @description Lấy URL công khai của file dựa trên Internal DB _id HOẶC publicFileId
 * @returns {Promise<object>} Đối tượng chứa fileId, publicFileId và publicUrl
 */
export const getFileUrl = async (fileId) => {
    let metadata;
    // 1. Thử tìm kiếm bằng _id MongoDB
    if (mongoose.Types.ObjectId.isValid(fileId)) {
         metadata = await FileMetadata.findById(fileId).select('publicUrl publicFileId');
    }
    
    // 2. Nếu không tìm thấy, thử tìm bằng publicFileId
    if (!metadata) {
        metadata = await FileMetadata.findOne({ publicFileId: fileId }).select('publicUrl publicFileId');
    }

    if (!metadata) {
        throw new Error('File not found.');
    }

    return { 
        fileId: metadata._id.toString(),
        publicFileId: metadata.publicFileId,
        publicUrl: metadata.publicUrl 
    };
};

/**
 * @description Lấy nhiều URLs bằng nhiều Public IDs (chuỗi string)
 * @param {string[]} publicFileIds Mảng Public ID (chuỗi string)
 * @returns {Promise<object[]>} Danh sách objects chứa fileId (ObjectId), publicFileId và publicUrl
 */
export const getBulkFilesUrl = async (publicFileIds) => {
    // 💡 CẬP NHẬT: Truy vấn bằng publicFileId thay vì _id
    const metadataList = await FileMetadata.find({ 
        publicFileId: { $in: publicFileIds } 
    }).select('_id publicFileId publicUrl');
    console.log(`Found ${metadataList.length} files for provided Public IDs.`);
    
    return metadataList.map(metadata => ({
        fileId: metadata._id.toString(),
        publicFileId: metadata.publicFileId,
        publicUrl: metadata.publicUrl,
    }));
};