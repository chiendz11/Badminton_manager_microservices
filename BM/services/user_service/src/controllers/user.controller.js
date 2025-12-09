import { UserService } from '../services/user.service.js';

export const UserController = {

    // Hàm gộp: Xử lý cả tìm kiếm (MeiliSearch) và lấy danh sách (DB)
    async getUsers(req, res) {
        try {
            // Lấy tất cả tham số từ URL Query (ví dụ: ?keyword=abc&page=1...)
            const { 
                keyword, // Dành cho tìm kiếm nâng cao (MeiliSearch)
                page, limit, search, level, sort, order, role, isActive // Dành cho list thường (DB)
            } = req.query;

            // -----------------------------------------------------------
            // TRƯỜNG HỢP 1: Có từ khóa 'keyword' -> Dùng MeiliSearch
            // -----------------------------------------------------------
            if (keyword) {
                // Lưu ý: searchUsersByKeyword cần nhận string, không phải object
                const users = await UserService.meiliFindUsersByKeywords(keyword);
                
                // Trả về kết quả tìm kiếm
                return res.status(200).json({ 
                    success: true, 
                    data: users 
                });
            }

            // -----------------------------------------------------------
            // TRƯỜNG HỢP 2: Không có 'keyword' -> Lấy danh sách từ DB (có phân trang/lọc)
            // -----------------------------------------------------------
            const result = await UserService.findAllUsers({
                page, limit, search, level, sort, order, role, isActive
            });

            // Trả về danh sách phân trang
            return res.status(200).json({ 
                success: true, 
                ...result 
            });

        } catch (error) {
            console.error("Error in getUsers:", error);
            return res.status(500).json({ 
                success: false, 
                message: "Internal Server Error." 
            });
        }
    },
    /**
     * GET /me: Lấy thông tin profile của người dùng hiện tại.
     * (userId được truyền qua header X-User-ID từ API Gateway)
     */
    async getMe(req, res, next) {
        // ... (Giữ nguyên logic getMe)
        const userId = req.headers['x-user-id'];
        const userRole = req.headers['x-user-role']; 

        console.log(`[UserService] getMe cho userId: ${userId}, role: ${userRole}`);

        if (!userId || !userRole) { 
            console.error("Authorization Header missing X-User-ID or X-User-Role.");
            return res.status(401).json({ message: "Authorization failed: User ID or Role missing." });
        }

        try {
            // 2. Gọi Service để lấy dữ liệu HỒ SƠ (Profile data)
            const userProfile = await UserService.findUserById(userId);

            if (!userProfile) {
                return res.status(404).json({ message: "User profile not found." });
            }

            // 💡 3. TRỘN (MERGE) DỮ LIỆU
            // Trộn dữ liệu Hồ sơ (từ UserService) với
            // dữ liệu Vai trò (từ Auth Service, đã được Gateway truyền qua header)
            const mergedProfile = { 
                ...userProfile,
                role: userRole // Thêm vai trò vào object
            };

            // 4. Trả về
            res.status(200).json(mergedProfile);

        } catch (error) {
            console.error("[UserController] Lỗi Server khi lấy profile (/me):", error);
            res.status(500).json({ message: "Internal Server Error." });
        }
    },

    /**
     * PATCH /me: Cập nhật thông tin profile cơ bản (name, phone_number, etc.)
     */
    async updateProfile(req, res) {
        const userId = req.headers['x-user-id'];
        const updateData = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Authorization failed: User ID missing." });
        }

        try {
            // 3. Xóa các trường không được phép cập nhật
            if (updateData.userId) delete updateData.userId;
            if (updateData.email) delete updateData.email;
            if (updateData.username) delete updateData.username;
            // Quan trọng: Ngăn chặn cập nhật trực tiếp avatar_url/file_id qua PATCH
            if (updateData.avatar_url) delete updateData.avatar_url;
            if (updateData.avatar_file_id) delete updateData.avatar_file_id;


            // 4. Gọi Service để cập nhật
            const updatedProfile = await UserService.updateProfile(userId, updateData);

            if (!updatedProfile) {
                return res.status(404).json({ message: "User profile not found to update." });
            }

            // 5. Trả về hồ sơ đã được cập nhật
            res.status(200).json(updatedProfile);

        } catch (error) {
            // 6. Xử lý lỗi (Validation, Trùng lặp)

            // Lỗi Validation từ Mongoose (ví dụ: SĐT sai định dạng)
            if (error.name === 'ValidationError') {
                console.warn("[UserService] Lỗi Validation khi cập nhật:", error.message);
                return res.status(400).json({ message: "Lỗi validation: " + error.message });
            }

            // Lỗi Trùng lặp (Duplicate Key) từ MongoDB
            if (error.code === 11000 && error.keyPattern?.phone_number) {
                return res.status(409).json({ message: "Lỗi: Số điện thoại đã được sử dụng." });
            }

            console.error("[UserController] Lỗi Server khi cập nhật profile:", error);
            res.status(500).json({ message: "Lỗi Server nội bộ." });
        }
    },

    /**
     * 💡 HÀM MỚI: PUT /me/avatar: Cập nhật ảnh đại diện.
     */
    async updateAvatar(req, res) {
        const userId = req.headers['x-user-id'];
        const file = req.file; // File được multer lưu trong Buffer

        if (!userId) {
            return res.status(401).json({ message: "Authorization failed: User ID missing." });
        }
        
        if (!file) {
            return res.status(400).json({ message: "Vui lòng chọn file ảnh để upload (Field name: 'avatar')." });
        }

        if (file.size > 5 * 1024 * 1024) { // Kiểm tra lại giới hạn file 5MB
             return res.status(400).json({ message: "Kích thước file vượt quá giới hạn 5MB." });
        }

        try {
            // 1. Gọi Service để xử lý toàn bộ luồng (Upload -> Cập nhật DB -> Xóa cũ)
            const updatedProfile = await UserService.updateAvatarData(
                userId, 
                file.buffer, 
                file.originalname
            );

            // 2. Trả về hồ sơ đã được cập nhật
            // (Chứa avatar_url mới mà FE sẽ dùng để hiển thị)
            res.status(200).json(updatedProfile);

        } catch (error) {
            console.error("[UserController] Lỗi Server khi cập nhật avatar:", error);
            // Xử lý các lỗi từ Storage API ném về
            const statusCode = error.message.includes('Storage Service') ? 503 : 500;
            res.status(statusCode).json({ message: error.message || "Lỗi Server nội bộ khi cập nhật avatar." });
        }
    },

    // ... (Giữ nguyên các hàm khác như createProfile)
    async createProfile(req, res) {
        // ... (Giữ nguyên logic tạo profile)
        const profileData = req.body;
        try {
            const newProfile = await UserService.createProfile(profileData);
            // Cấu trúc response phù hợp với chuẩn
            res.status(201).json({ 
                message: "User profile created successfully.", 
                user: newProfile 
            });
        } catch (error) {
        // 💡 CẢI TIẾN: Bắt lỗi cụ thể (nếu bạn thêm lỗi tùy chỉnh ở Service)
        if (error.message === "USER_PROFILE_ALREADY_EXISTS") {
             // Báo lỗi 409 rõ ràng
             return res.status(409).json({ message: "Lỗi: User Profile đã tồn tại." });
        }
        
        // Bắt lỗi Duplicate Key 11000 (cách hiện tại của bạn)
        if (error.code === 11000) {
            return res.status(409).json({ message: "Lỗi: Username hoặc Email đã tồn tại (Duplicate Key)." });
        }
        
        console.error("[UserController] Lỗi Server khi tạo profile:", error);
        res.status(500).json({ message: "Lỗi Server nội bộ khi tạo profile." });
    }
    },

    async getAllUsers(req, res) {
        try {
            // Destructure thêm isActive
            const { page, limit, search, level, sort, order, role, isActive } = req.query;

            const result = await UserService.findAllUsers({
                page, limit, search, level, sort, order, role, isActive
            });

            res.status(200).json({ success: true, ...result });
        } catch (error) {
            console.error("Error getting users:", error);
            res.status(500).json({ success: false, message: "Lỗi Server." });
        }
    },

    // 💡 API: Đổi trạng thái (Ban/Unban)
    async updateUserStatus(req, res) {
        try {
            const { userId } = req.params;
            const { isActive } = req.body; // Expect boolean: true/false

            if (typeof isActive !== 'boolean') {
                return res.status(400).json({ message: "Invalid status value" });
            }

            await UserService.toggleUserStatus(userId, isActive);

            res.status(200).json({ 
                success: true, 
                message: `Đã cập nhật trạng thái user thành ${isActive ? 'ACTIVE' : 'BANNED'}` 
            });
        } catch (error) {
            console.error("Error updating status:", error);
            res.status(500).json({ success: false, message: "Lỗi Server." });
        }
    },
    async updateUserById(req, res) {
        try {
            const { userId } = req.params; // Lấy publicUserId (UUID) từ URL
            const updateData = req.body;

            // Validation cơ bản
            if (!userId) {
                return res.status(400).json({ message: "User ID là bắt buộc." });
            }

            // Gọi Service
            const updatedUser = await UserService.updateUserById(userId, updateData);

            if (!updatedUser) {
                return res.status(404).json({ message: "[UserService] Không tìm thấy người dùng." });
            }

            res.status(200).json({
                success: true,
                message: "Cập nhật thông tin người dùng thành công.",
                data: updatedUser
            });

        } catch (error) {
            console.error(`[UserController] Lỗi cập nhật user ${req.params.userId}:`, error);
            res.status(500).json({ 
                success: false, 
                message: error.message || "Lỗi Server nội bộ." 
            });
        }
    }
};