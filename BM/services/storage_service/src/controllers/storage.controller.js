// 💡 Import Service thay vì Model và Cloudinary logic
import { saveNewFileMetadata, deleteFileAndMetadata, getFileUrl, getBulkFilesUrl } from '../services/file.service.js'; 

/**
 * @description Xử lý Request Upload file lên Cloudinary và lưu metadata vào DB
 * @route POST /api/v1/storage/upload
 * @access Internal/Private
 */
export const uploadNewFile = async (req, res) => {
    try {
        const file = req.file;
        // uploaderId, fileType, tags là các trường mà User Service gửi kèm qua form-data
        const { uploaderId, fileType, tags } = req.body; 
        
        // Lấy service name từ internalAuth middleware (req.serviceName)
        const uploaderService = req.serviceName; 

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }
        if (!uploaderId || !fileType) {
            return res.status(400).json({ message: 'uploaderId and fileType are required in body.' });
        }
        
        // GỌI SERVICE XỬ LÝ LOGIC NGHIỆP VỤ
        const newFile = await saveNewFileMetadata({
            fileBuffer: file.buffer,
            uploaderId,
            uploaderService,
            fileType,
            tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : [],
        });

        // Trả về metadata để User Service cập nhật DB của nó
        return res.status(201).json({
            message: 'File uploaded successfully',
            file: newFile
        });

    } catch (error) {
        console.error('[StorageController] Lỗi khi upload file:', error);
        res.status(500).json({ message: 'Internal Server Error during file upload.' });
    }
};

/**
 * @description Xử lý Request Xóa file vật lý và metadata
 * @route DELETE /api/v1/storage/:fileId
 * @access Internal/Private
 */
export const deleteFileById = async (req, res) => {
    const { fileId } = req.params; // fileId là Public File ID (vd: FILE-uuidv4())
    const serviceName = req.serviceName; // Dùng để ghi log

    try {
        if (!fileId) {
             return res.status(400).json({ message: 'File ID is required.' });
        }

        // GỌI SERVICE XỬ LÝ LOGIC NGHIỆP VỤ (Xóa trên Cloud và DB)
        const deletedMetadata = await deleteFileAndMetadata(fileId);

        // Trả về thành công
        return res.status(200).json({ 
            message: `File ${fileId} successfully deleted by ${serviceName}.`,
            deleted: deletedMetadata
        });
        
    } catch (error) {
        console.error(`Error deleting file ID ${fileId}:`, error.message);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        return res.status(statusCode).json({ message: error.message, error: error.message });
    }
};

/**
 * @description Xử lý Request Lấy URL file dựa trên ID metadata nội bộ
 * @route GET /api/v1/storage/:fileId
 * @access Internal/Private
 */
export const getFileUrlById = async (req, res) => {
    const { fileId } = req.params;
    try {
        // GỌI SERVICE XỬ LÝ LOGIC NGHIỆP VỤ
        const fileData = await getFileUrl(fileId);

        return res.status(200).json(fileData);
        
    } catch (error) {
        console.error(`Error fetching file URL for ID ${fileId}:`, error.message);
        const statusCode = error.message.includes('File not found') ? 404 : 500;
        return res.status(statusCode).json({ message: error.message, error: error.message });
    }
};

/**
 * @description Xử lý Request Lấy nhiều URLs bằng nhiều Public IDs (chuỗi string)
 * @route POST /api/v1/storage/bulk-urls
 * @access Internal/Private
 */
export const getFilesUrlByIds = async (req, res) => {
    try {
        const { fileIds } = req.body; // fileIds giờ đây là mảng Public ID

        if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ message: 'Invalid or empty fileIds array provided.' });
        }

        // GỌI SERVICE XỬ LÝ LOGIC NGHIỆP VỤ (truy vấn DB)
        const results = await getBulkFilesUrl(fileIds);

        return res.status(200).json(results);

    } catch (error) {
        console.error('Error fetching bulk file URLs:', error.message);
        return res.status(500).json({ message: 'Internal Server Error.' });
    }
};