import { User } from '../models/user.model.js';
import { StorageClient } from '../clients/storage.client.js'; // 💡 IMPORT API MỚI
import { DEFAULT_AVATAR_FILE_ID } from '../configs/env.config.js';
import { UserExtraService } from './user-extra.service.js';
import { MeiliSearch } from 'meilisearch';
import { publishToExchange } from '../clients/rabbitmq.client.js';


const client = new MeiliSearch({
    host: process.env.MEILISEARCH_URL || 'http://my_meilisearch:7700',
    apiKey: 'masterKey123'
})

export const UserService = {

    async meiliFindUsersByKeywords(keywords) {
        try {
            const index = client.index('users');
            const result = await index.search(keywords)
            return result.hits;
        } catch (error) {
            console.error("MeiliSearch findUsersByKeywords Error:", error);
            throw error;
        }
    },

    // Tìm người dùng theo userId (UUID)
    async findUserById(userId) {
        // ... (Giữ nguyên logic findUserById)
        const cleanUserId = userId
            ? userId.trim()
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
        try {
            // 1. Tạo một đối tượng User mới từ Schema và dữ liệu được truyền vào.
            const newUser = new User(profileData);

            // 2. Lưu vào MongoDB.
            await newUser.save();
            await UserExtraService.initUserExtra(newUser.userId);

            // 3. Trả về đối tượng profile đã lưu
            const savedProfile = newUser.toObject();

            console.log(`[UserService] ✅ Tạo hồ sơ mới thành công cho userId: ${savedProfile.userId}`);

            // 👇 4. GỬI MESSAGE TỚI RABBITMQ
            // Booking Service cần userId và points (mặc định là 0)
            const eventMessage = {
                type: 'USER_CREATED',
                payload: {
                    userId: savedProfile.userId,
                    points: savedProfile.points || 0,
                    // Có thể gửi thêm name, avatar nếu Booking cần hiển thị
                    name: savedProfile.name
                },
                timestamp: new Date()
            };

            // Gọi hàm publish đã có sẵn trong rabbitmq.client.js
            // Routing key để rỗng vì exchange là 'fanout'
            await publishToExchange('', eventMessage);

            return savedProfile;

        } catch (error) {
            console.error(`[UserService] Lỗi khi tạo profile:`, error.message);
            throw error;
        }
    },

    // Cập nhật thông tin profile cơ bản (name, phone_number, etc.)
    async updateProfile(userId, dataToUpdate) {
        // ... (Giữ nguyên logic updateProfile)
        const cleanUserId = userId.trim();

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

    async updateUserById(userId, data) {
        try {
            const cleanUserId = userId.trim();

            // 1. Lọc dữ liệu (Security Best Practice)
            // Chỉ cho phép Admin cập nhật các trường thông tin cá nhân tại đây.
            // Các trường Identity (email, username, role) phải được xử lý qua quy trình đồng bộ từ Auth Service.
            const allowedUpdates = {};

            if (data.name) allowedUpdates.name = data.name.trim();
            if (data.phone_number) allowedUpdates.phone_number = data.phone_number.trim();

            // (Mở rộng: Nếu sau này muốn cho Admin sửa avatar qua link/id trực tiếp)
            if (data.avatar_file_id) allowedUpdates.avatar_file_id = data.avatar_file_id;
            if (data.avatar_url) allowedUpdates.avatar_url = data.avatar_url;

            // ⚠️ CẢNH BÁO: Không cập nhật email/username ở đây để tránh lệch data với Auth Service.
            // Nếu payload có gửi email/username, ta lờ đi.

            // 2. Thực hiện Update
            const updatedUser = await User.findOneAndUpdate(
                { userId: cleanUserId }, // Tìm theo UUID
                { $set: allowedUpdates },
                { new: true, runValidators: true } // Trả về document mới nhất và chạy validate schema
            ).select('-__v'); // Ẩn version key

            return updatedUser;

        } catch (error) {
            console.error(`[UserService] updateUserById Error:`, error.message);
            throw error;
        }
    },

    // 💡 HÀM MỚI: Cập nhật Avatar (Bao gồm Upload và Xóa file cũ)
    async updateAvatarData(userId, fileBuffer, originalname) {
        const cleanUserId = userId.trim();

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
    },

    async findAllUsers({ page = 1, limit = 10, search = '', level = '', sort = 'createdAt', order = 'desc', role = '', isActive }) {
        try {
            const skip = (page - 1) * limit;
            const query = {};

            // Lọc theo Role (Bắt buộc cho trang UserManage)
            if (role) {
                query.role = role.toUpperCase();
            }

            // Lọc theo Trạng thái (Active / Banned)
            // Lưu ý: query param gửi lên thường là string 'true'/'false'
            if (isActive !== undefined && isActive !== '') {
                query.isActive = (isActive === 'true');
            }

            // Tìm kiếm (Tên, Email, SĐT)
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                query.$or = [
                    { name: searchRegex },
                    { email: searchRegex },
                    { phone_number: searchRegex }
                ];
            }

            // Lọc theo Rank
            if (level && level !== 'Tất cả') {
                query.level = level.toLowerCase();
            }

            // Thực thi Query
            const [totalDocs, users] = await Promise.all([
                User.countDocuments(query),
                User.find(query)
                    .select('-__v')
                    .sort({ [sort]: order === 'asc' ? 1 : -1 })
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean()
            ]);

            return {
                data: users,
                pagination: {
                    totalDocs,
                    limit: parseInt(limit),
                    totalPages: Math.ceil(totalDocs / limit),
                    page: parseInt(page),
                    hasPrevPage: page > 1,
                    hasNextPage: page < Math.ceil(totalDocs / limit)
                }
            };
        } catch (error) {
            console.error(`[UserService] findAllUsers Error:`, error.message);
            throw error;
        }
    },
    async updateUserStatus(userId, isActive) {
        try {
            const cleanUserId = userId.trim();
            const updatedUser = await User.findOneAndUpdate(
                { userId: cleanUserId },
                { $set: { isActive: isActive } },
                { new: true }
            ).select('-__v').lean();
            if (!updatedUser) {
                throw new Error("Không tìm thấy hồ sơ người dùng để cập nhật trạng thái.");
            }
            return updatedUser;
        } catch (error) {
            console.error(`[UserService] updateUserStatus Error:`, error.message);
            throw error;
        }
    }
};