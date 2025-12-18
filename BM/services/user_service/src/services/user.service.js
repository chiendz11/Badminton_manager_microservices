import { User } from '../models/user.model.js';
import { StorageClient } from '../clients/storage.client.js';
import { DEFAULT_AVATAR_FILE_ID } from '../configs/env.config.js';
import { UserExtraService } from './user-extra.service.js';
import { MeiliSearch } from 'meilisearch';
import { publishToExchange, ROUTING_KEYS } from '../clients/rabbitmq.client.js';
import consola from 'consola';

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
            console.error("MeiliSearch Error:", error);
            return []; // Trả về mảng rỗng thay vì throw để UI không crash
        }
    },

    async findUserById(userId) {
        const cleanUserId = userId ? userId.trim() : null;
        if (!cleanUserId) return null;

        try {
            const user = await User.findOne({ userId: cleanUserId }).lean();
            if (!user) return null;
            return user;
        } catch (error) {
            console.error(`[UserService] DB Query Failed for User ID ${cleanUserId}`, error);
            throw new Error(`DB Query Failed`);
        }
    },

    async createProfile(profileData) {
        try {
            consola.info(`[UserService] Creating profile: ${profileData.email}`);

            // 1. Lưu vào DB
            const savedProfile = await User.findOneAndUpdate(
                {
                    $or: [
                        { email: profileData.email },
                        { username: profileData.username }
                    ]
                },
                { $set: profileData },
                { new: true, upsert: true, lean: true }
            );

            // 2. Init bảng phụ
            await UserExtraService.initUserExtra(savedProfile.userId);

            // 3. Chuẩn bị message
            const eventMessage = {
                type: 'USER_CREATED',
                payload: savedProfile,
                timestamp: new Date()
            };

            // 4. Bắn tin với Key riêng: user.create.profile
            await publishToExchange(ROUTING_KEYS.USER_PROFILE_CREATE_EVENT, eventMessage);

            return savedProfile;
        } catch (error) {
            console.error(`[UserService] Create Profile Error:`, error.message);
            throw error;
        }
    },

    async updateProfile(userId, dataToUpdate) {
        const cleanUserId = userId.trim();
        try {
            const savedProfile = await User.findOneAndUpdate(
                { userId: cleanUserId },
                { $set: dataToUpdate },
                {
                    new: true,
                    runValidators: true,
                    select: 'userId name phone_number avatar_file_id avatar_url level points createdAt email username',
                    lean: true
                }
            );

            if (!savedProfile) throw new Error("User not found for update.");

            const eventMessage = {
                type: 'USER_UPDATED',
                payload: savedProfile,
                timestamp: new Date()
            };
            await publishToExchange(ROUTING_KEYS.USER_PROFILE_UPDATE_EVENT, eventMessage);

            return savedProfile;
        } catch (error) {
            console.error(`[UserService] Update Profile Error:`, error.message);
            throw error;
        }
    },

    async updateUserById(userId, data) {
        try {
            const cleanUserId = userId.trim();
            const allowedUpdates = {};
            if (data.name) allowedUpdates.name = data.name.trim();
            if (data.phone_number) allowedUpdates.phone_number = data.phone_number.trim();
            if (data.avatar_file_id) allowedUpdates.avatar_file_id = data.avatar_file_id;
            if (data.avatar_url) allowedUpdates.avatar_url = data.avatar_url;

            const savedProfile = await User.findOneAndUpdate(
                { userId: cleanUserId },
                { $set: allowedUpdates },
                { new: true, runValidators: true }
            ).select('-__v');

            if (savedProfile) {
                const eventMessage = {
                    type: 'USER_UPDATED',
                    payload: savedProfile,
                    timestamp: new Date()
                };
                await publishToExchange(ROUTING_KEYS.USER_PROFILE_UPDATE_EVENT, eventMessage);
            }

            return savedProfile;
        } catch (error) {
            console.error(`[UserService] updateUserById Error:`, error.message);
            throw error;
        }
    },

    async updateAvatarData(userId, fileBuffer, originalname) {
        const cleanUserId = userId.trim();
        if (!cleanUserId || !fileBuffer) throw new Error("Invalid upload data.");

        const currentUser = await this.findUserById(cleanUserId);
        if (!currentUser) throw new Error("User not found.");
        const oldFileId = currentUser.avatar_file_id;

        let newFileMetadata;
        try {
            newFileMetadata = await StorageClient.uploadFile(
                fileBuffer, originalname, cleanUserId, 'avatar'
            );

            const updatedUser = await User.findOneAndUpdate(
                { userId: cleanUserId },
                {
                    $set: {
                        avatar_file_id: newFileMetadata.publicFileId,
                        avatar_url: newFileMetadata.publicUrl
                    }
                },
                { new: true, lean: true }
            );

            if (!updatedUser) {
                await StorageClient.deleteFile(newFileMetadata.publicFileId);
                throw new Error("DB Update failed after upload.");
            }

            if (oldFileId && oldFileId !== DEFAULT_AVATAR_FILE_ID) {
                await StorageClient.deleteFile(oldFileId);
            }

            return updatedUser;
        } catch (error) {
            if (newFileMetadata?.publicFileId) {
                await StorageClient.deleteFile(newFileMetadata.publicFileId);
            }
            throw error;
        }
    },

    async findAllUsers({ page = 1, limit = 10, search = '', level = '', sort = 'createdAt', order = 'desc', role = '', isActive }) {
        try {
            const skip = (page - 1) * limit;
            const query = {};

            if (role) query.role = role.toUpperCase();
            if (isActive !== undefined && isActive !== '') query.isActive = (isActive === 'true');
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                query.$or = [{ name: searchRegex }, { email: searchRegex }, { phone_number: searchRegex }];
            }
            if (level && level !== 'Tất cả') query.level = level.toLowerCase();

            const [totalDocs, users] = await Promise.all([
                User.countDocuments(query),
                User.find(query).select('-__v').sort({ [sort]: order === 'asc' ? 1 : -1 }).skip(skip).limit(parseInt(limit)).lean()
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

            // 1. Cập nhật DB
            const updatedUser = await User.findOneAndUpdate(
                { userId: cleanUserId },
                { $set: { isActive: isActive } },
                { new: true }
            ).select('-__v').lean();

            if (!updatedUser) throw new Error("User not found for status update.");

            // 2. Bắn Event sang RabbitMQ để Booking Service bắt
            const eventMessage = {
                type: 'USER_STATUS_UPDATED',  // 👈 Type riêng cho status
                payload: {
                    userId: updatedUser.userId,
                    isActive: updatedUser.isActive
                },
                timestamp: new Date()
            };

            // Dùng Routing Key riêng cho status (ví dụ: 'user.update.status')
            await publishToExchange(ROUTING_KEYS.USER_STATUS_UPDATE_EVENT, eventMessage);

            consola.info(`[UserService] Status updated & event published for: ${cleanUserId}`);

            return updatedUser;
        } catch (error) {
            console.error(`[UserService] updateUserStatus Error:`, error.message);
            throw error;
        }
    },

    // 👇👇 CÁC HÀM MỚI ĐỂ XỬ LÝ SỰ KIỆN TỪ BOOKING SERVICE 👇👇

    async updateUserPoints(userId, pointsToAdd) {
        try {
            const updatedUser = await User.findOneAndUpdate(
                { userId: userId },
                { $inc: { points: pointsToAdd } }, // Cộng dồn điểm
                { new: true }
            );
            return updatedUser;
        } catch (error) {
            consola.error('Error updating points:', error);
            throw error;
        }
    },

    // 👇 1. Xử lý khi phát hiện Spam
    async handleSpamDetection(userId) {
        try {
            const user = await User.findOne({ userId });
            if (!user) return;

            const newCount = (user.violationCount || 0) + 1;

            if (newCount >= MAX_VIOLATIONS_BEFORE_HARD_BAN) {
                // 🛑 TRƯỜNG HỢP 1: HARD BAN (QUÁ GIỚI HẠN)
                await User.updateOne(
                    { userId },
                    {
                        $set: {
                            isActive: false,
                            isSpamming: false,
                            violationCount: newCount
                        },
                        $unset: { lastSpamTime: 1 }
                    }
                );
                consola.error(`💀 HARD BAN USER ${userId}: Reached ${newCount} violations.`);

                // 👇👇 [QUAN TRỌNG] BẮN EVENT ĐỂ BOOKING SERVICE BIẾT 👇👇
                await publishToExchange(ROUTING_KEYS.USER_STATUS_UPDATE_EVENT, {
                    userId: userId,
                    isActive: false, // Báo tử
                    reason: `Hard ban due to ${newCount} spam violations`
                });

            } else {
                // ⚠️ TRƯỜNG HỢP 2: SOFT BAN (CÒN CƠ HỘI)
                await User.updateOne(
                    { userId },
                    {
                        $set: {
                            isSpamming: true,
                            lastSpamTime: new Date(),
                            violationCount: newCount
                        }
                    }
                );
                consola.warn(`⚠️ SOFT BAN USER ${userId}: Violation ${newCount}/${MAX_VIOLATIONS_BEFORE_HARD_BAN}`);

                // (Tùy chọn) Bạn có thể không cần bắn event ở đây nếu Booking Service 
                // đã tự set isSpamming=true lúc phát hiện rồi.
                // Nhưng nếu muốn chắc chắn đồng bộ, bắn thêm cũng không sao.
            }
        } catch (error) {
            consola.error('Error handling spam detection:', error);
        }
    },

    async unmarkUserSpam(userId) {
        try {
            await User.findOneAndUpdate(
                { userId: userId },
                {
                    $set: { isSpamming: false },
                    $unset: { lastSpamTime: 1 } // Xóa trường thời gian
                }
            );
        } catch (error) {
            consola.error('Error unmarking spam:', error);
            throw error;
        }
    }
};