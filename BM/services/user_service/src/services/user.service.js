import { User } from '../models/user.model.js';
import { StorageClient } from '../clients/storage.client.js'; // 💡 IMPORT API MỚI
import { DEFAULT_AVATAR_FILE_ID } from '../configs/env.config.js';

export const UserService = {
    // Tìm người dùng theo userId (UUID)
    async findUserById(userId) {
        // ... (Giữ nguyên logic findUserById)
        const cleanUserId = userId
            ? userId.trim().toLowerCase()
            : null;

        console.log(`[UserService] Bắt đầu tìm kiếm User ID (UUID, chuẩn hóa): ${cleanUserId}`);

        if (!cleanUserId) {
            return null;
        }

        try {
            // Sử dụng findOne với index 'userId' là cách chuẩn và hiệu quả
            const user = await User.findOne({ userId: cleanUserId }).lean();
            // Mặc định chọn tất cả trừ __v
            if (!user) {
                console.warn(`[UserService] ❌ Không tìm thấy hồ sơ User trong MongoDB với userId: ${cleanUserId}`);
                return null;
            }

            console.log(`[UserService] ✅ Tìm thấy hồ sơ User.`);
            return user;

        } catch (error) {
            console.error(`[UserService] Lỗi khi truy vấn DB cho userId ${cleanUserId}:`, error.message);
            // Ném lỗi để Controller (nơi gọi) có thể bắt và xử lý (vd: trả về 500)
            throw new Error(`DB Query Failed for User ID ${cleanUserId}`);
        }
    },

    // Tạo hồ sơ người dùng (profile) mới
    async createProfile(profileData) {
        // ... (Giữ nguyên logic tạo profile)
        try {
            // 1. Tạo một đối tượng User mới từ Schema và dữ liệu được truyền vào.
            const newUser = new User(profileData);
            // 2. Lưu vào MongoDB.
            await newUser.save();

            // 3. Trả về đối tượng profile đã lưu (dùng .lean() để chuyển về Plain JS Object)
            const savedProfile = newUser.toObject();

            console.log(`[UserService] ✅ Tạo hồ sơ mới thành công cho userId: ${savedProfile.userId}`);
            return savedProfile;

        } catch (error) {
            console.error(`[UserService] Lỗi khi tạo profile:`, error.message);
            throw error; // Ném lỗi (ví dụ: 11000 Duplicate Key) để Controller xử lý.
        }
    },

    // Cập nhật thông tin profile cơ bản (name, phone_number, etc.)
    async updateProfile(userId, dataToUpdate) {
        // ... (Giữ nguyên logic updateProfile)
        const cleanUserId = userId.trim().toLowerCase();

        try {
            const updatedUser = await User.findOneAndUpdate(
                { userId: cleanUserId },  // Điều kiện tìm (bằng UUID)
                { $set: dataToUpdate },   // Dữ liệu cần cập nhật
                {
                    new: true,
                    runValidators: true, // 💡 Quan trọng: Chạy lại validation (vd: check unique SĐT)
                    select: [
                        'userId', 'name', 'phone_number', 'avatar_file_id', 'avatar_url', 'level', 'points',
                        'createdAt',
                        'email', 'username'
                    ].join(' '),
                    lean: true
                }
            );

            if (!updatedUser) {
                // Lỗi này không nên xảy ra nếu logic FE đúng
                console.warn(`[UserService] ❌ Không tìm thấy hồ sơ User để CẬP NHẬT (userId: ${cleanUserId})`);
                throw new Error("Không tìm thấy hồ sơ người dùng để cập nhật.");
            }

            console.log(`[UserService] ✅ Cập nhật hồ sơ thành công cho userId: ${cleanUserId}`);
            return updatedUser;

        } catch (error) {
            // Lỗi (thường là 11000 - Trùng SĐT) sẽ được Controller bắt
            console.error(`[UserService] Lỗi khi cập nhật hồ sơ cho userId ${cleanUserId}:`, error.message);
            throw error;
        }
    },

    // 💡 HÀM MỚI: Cập nhật Avatar (Bao gồm Upload và Xóa file cũ)
    async updateAvatarData(userId, fileBuffer, originalname) {
        const cleanUserId = userId.trim().toLowerCase();

        if (!cleanUserId || !fileBuffer) {
            throw new Error("Dữ liệu upload không hợp lệ.");
        }

        // 1. Lấy thông tin User hiện tại để lấy ID file cũ (nếu có)
        const currentUser = await this.findUserById(cleanUserId);
        if (!currentUser) {
            throw new Error("Không tìm thấy hồ sơ người dùng để cập nhật avatar.");
        }
        const oldFileId = currentUser.avatar_file_id; // ID file cũ

        let newFileMetadata;
        try {
            // 2. GỌI API NỘI BỘ (PROXY) để upload file mới lên Storage Service
            newFileMetadata = await StorageClient.uploadFile(
                fileBuffer,
                originalname,
                cleanUserId,
                'avatar' // Loại file
            );

            // 3. CẬP NHẬT DB (Lưu URL và ID file mới)
            const updatedUser = await User.findOneAndUpdate(
                { userId: cleanUserId },
                {
                    $set: {
                        avatar_file_id: newFileMetadata.publicFileId,
                        avatar_url: newFileMetadata.publicUrl
                    }
                },
                {
                    new: true,
                    select: [
                        'userId', 'name', 'phone_number', 'avatar_file_id', 'avatar_url', 'level', 'points',
                        'createdAt', 'email', 'username'
                    ].join(' '),
                    lean: true
                }
            );

            if (!updatedUser) {
                // Nếu update DB thất bại, cần dọn dẹp file đã upload ở bước 2
                await StorageClient.deleteFile(newFileMetadata.publicFileId);
                throw new Error("Không tìm thấy hồ sơ người dùng để cập nhật avatar.");
            }

            // 4. GỌI API NỘI BỘ để XÓA file cũ (nếu có)
            if (oldFileId) {
                console.log(`[UserService] Tìm thấy avatar cũ (custom), tiến hành xóa: ${oldFileId}`);

                // (Tùy chọn: Vẫn nên giữ check DEFAULT_ID ở đây một thời gian 
                // để hỗ trợ các user cũ chưa được migrate dữ liệu)
                if (oldFileId !== DEFAULT_AVATAR_FILE_ID) {
                    await StorageClient.deleteFile(oldFileId);
                }
            } else {
                console.log(`[UserService] User đang dùng avatar mặc định (null), không cần xóa file cũ.`);
            }

            console.log(`[UserService] ✅ Cập nhật AVATAR thành công cho userId: ${cleanUserId}`);
            return updatedUser;

        } catch (error) {
            console.error(`[UserService] Lỗi khi xử lý AVATAR cho userId ${cleanUserId}:`, error.message);
            // Quan trọng: Nếu lỗi xảy ra sau khi upload (bước 2), cần dọn dẹp file đã upload
            if (newFileMetadata && newFileMetadata.publicFileId) {
                await StorageClient.deleteFile(newFileMetadata.publicFileId);
            }
            throw error;
        }
    }
};