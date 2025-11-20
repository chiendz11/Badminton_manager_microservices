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
 * @returns {Promise<object>} Đối tượng metadata file đã lưu
 */
export const saveNewFileMetadata = async ({ fileBuffer, uploaderId, uploaderService, fileType, tags }) => {
    // 1. Upload lên Cloudinary
    const cloudinaryResult = await uploadFileToCloudinary(fileBuffer, fileType);

    // 2. Tạo Public ID Nghiệp vụ
    const publicFileId = `FILE-${uuidv4()}`;

    // 3. Tạo và lưu bản ghi Metadata
    const newMetadata = new FileMetadata({
        publicFileId,
        uploaderId,
        uploaderService,
        fileType,
        cloudinaryPublicId: cloudinaryResult.publicId,
        publicUrl: cloudinaryResult.url,
        resourceType: cloudinaryResult.resourceType,
        fileSize: fileBuffer.length,
        tags: tags || [],
    });

    await newMetadata.save();

    console.log(`[FileService] ✅ File saved: ${publicFileId} from ${uploaderService}`);

    return newMetadata.toObject();
};

/**
 * 💡 HÀM MỚI: Xóa file khỏi Cloud và metadata khỏi DB
 * @description Xóa file khỏi Cloudinary và bản ghi metadata trong DB
 * @param {string} publicFileId ID nghiệp vụ công khai của file (vd: FILE-uuidv4())
 * @returns {Promise<object>} Metadata của file đã xóa
 */
export const deleteFileAndMetadata = async (publicFileId) => {
    // 1. Tìm bản ghi Metadata
    const metadata = await FileMetadata.findOne({ publicFileId: publicFileId }).lean();
    
    if (!metadata) {
        console.warn(`[FileService] ⚠️ Cảnh báo: Không tìm thấy Metadata cho publicFileId: ${publicFileId}.`);
        // Nếu không tìm thấy, vẫn coi là thành công
        return { message: "Metadata not found, assumed already deleted." };
    }

    // 2. Xóa file trên Cloudinary
    // Dùng try/catch để đảm bảo ngay cả khi Cloudinary lỗi, metadata vẫn được xóa
    try {
        await deleteFileByPublicId(metadata.cloudinaryPublicId, metadata.resourceType);
    } catch (cloudError) {
        console.error(`[FileService] ❌ Lỗi khi xóa file CLOUDINARY cho ID ${publicFileId}:`, cloudError.message);
        // Có thể ghi log và tiếp tục xóa metadata, hoặc ném lỗi tùy chính sách
        // Ở đây, ta ghi log cảnh báo và tiếp tục xóa metadata để DB nhất quán
    }

    // 3. Xóa bản ghi Metadata trong MongoDB
    await FileMetadata.deleteOne({ publicFileId: publicFileId });
    
    console.log(`[FileService] ✅ File và Metadata đã được xóa cho publicFileId: ${publicFileId}`);
    return metadata;
};

/**
 * @description Lấy URL file dựa trên fileId (MongoDB _id HOẶC publicFileId)
 * @param {string} fileId MongoDB _id HOẶC publicFileId
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
    }).select('publicUrl publicFileId').lean();

    return metadataList.map(metadata => ({
        fileId: metadata._id.toString(),
        publicFileId: metadata.publicFileId,
        publicUrl: metadata.publicUrl
    }));
};