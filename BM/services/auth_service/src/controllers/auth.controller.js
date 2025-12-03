// services/auth_service/src/controllers/auth.controller.js

import { AuthService } from '../services/auth.service.js';
import { TokenService } from '../services/token.service.js';
import { Prisma } from '@prisma/client';
import ms from 'ms';

// -----------------------------------------------------------------
// AuthController: Gom tất cả các hàm xử lý request (Controller handlers)
// -----------------------------------------------------------------

export const AuthController = {
    /**
     * POST /users: Đăng ký người dùng mới.
     */
    createUser: async (req, res, next) => {
        try {
            // 💡 Gọi Service để xử lý logic nghiệp vụ
            const newUser = await AuthService.registerUser(req.body);

            res.status(202).json({
                message: "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.",
                user: newUser
            });
        } catch (error) {
            // Log lỗi chi tiết để debug ở Server
            console.error("[AuthController] Lỗi khi tạo người dùng:", error);

            // 💡 Lấy thông báo lỗi chi tiết nhất: từ error.message (lỗi throw) 
            // HOẶC từ error.response.data.message (lỗi Axios API)
            const serviceErrorMessage = error.message || error.response?.data?.message || "";


            // 1. Xử lý lỗi trùng lặp (P2002) từ Prisma (Auth Service DB)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return res.status(409).json({ message: "Email hoặc Tên đăng nhập đã được sử dụng." });
            }
            
            // 2. 💡 XỬ LÝ LỖI CONFLICT TỪ SERVICE KHÁC (UserService)
            // Nếu Service layer ném ra Error với nội dung chỉ ra trùng lặp
            if (serviceErrorMessage.includes("Duplicate Key") || serviceErrorMessage.includes("đã tồn tại")) {
                 // Gửi mã 409 (Conflict) vì đây là lỗi trùng lặp
                 return res.status(409).json({ message: "Email hoặc Tên đăng nhập đã được sử dụng." });
            }

            // 3. Xử lý lỗi Service cụ thể (ví dụ: lỗi gửi email)
            if (serviceErrorMessage.includes("Không thể gửi email")) {
                return res.status(503).json({ message: "Lỗi dịch vụ email. Vui lòng thử lại sau." });
            }
            
            // 4. Xử lý lỗi Validation nội bộ từ các Service khác (nếu có, ví dụ: tạo profile)
            if (error.isUserValidation) {
                return res.status(400).json({ message: error.message });
            }
            
            // 5. Các lỗi khác không được xử lý cụ thể sẽ chuyển sang Error Handler (thường là 500)
            next(error);
        }
    },

    /**
     * GET /verifications/:token: Xác minh email.
     */
    verifyUser: async (req, res, next) => {
        const { token } = req.params;

        if (!token) {
            return res.status(400).send("Thiếu mã xác minh.");
        }

        try {
            await AuthService.verifyUserEmail(token);

            // Trả về HTML cho trình duyệt
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(`<h1>Xác minh thành công!</h1><p>Địa chỉ email của bạn đã được xác minh. Bạn có thể đóng cửa sổ này và đăng nhập vào ứng dụng.</p>`);

        } catch (error) {
            // Trả về HTML cho lỗi xác minh
            res.status(400).send(`<h1>Lỗi xác minh</h1><p>${error.message}</p>`);
            // Không nên gọi next(error) vì response đã được gửi
        }
    },

    /**
     * POST /sessions: Đăng nhập và tạo phiên mới (Access Token và Refresh Token).
     */
    createSession: async (req, res, next) => {
        // 💡 LẤY THÊM CLIENTID TỪ BODY
        const { identifier, password, clientId } = req.body;

        try {
            // 💡 KIỂM TRA CLIENTID LÀ BẮT BUỘC
            if (!clientId) {
                const error = new Error("ClientId (Application ID) là bắt buộc.");
                throw Object.assign(error, { statusCode: 400 });
            }

            // 💡 Gọi Service, TRUYỀN clientId vào
            const result = await AuthService.authenticateUser(
                identifier,
                password,
                clientId, // THAM SỐ MỚI
                req
            );

            // Thiết lập Refresh Token trong HttpOnly Cookie
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: ms(process.env.REFRESH_TOKEN_EXPIRY || '7d'),
                sameSite: 'strict'
            });

            // Trả về Access Token và thông tin user cơ bản
            res.status(200).json({
                message: "Đăng nhập thành công!",
                accessToken: result.accessToken,
                user: result.user
            });
        } catch (error) {
            // Xử lý lỗi xác thực (400) hoặc khóa/cấm truy cập (403)
            if (error.statusCode === 400 || error.statusCode === 403 || error.statusCode === 401) {
                return res.status(error.statusCode).json({ message: error.message });
            }

            // Chuyển các lỗi khác (500) cho middleware xử lý lỗi chung
            next(error);
        }
    },

    /**
     * DELETE /sessions: Đăng xuất (Xóa Refresh Token từ DB và Cookie).
     */
    deleteSession: async (req, res, next) => {
        const refreshToken = req.cookies?.refreshToken;

        // Xóa cookie bất kể DB có thành công hay không
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        if (!refreshToken) {
            return res.status(200).json({ message: "Đăng xuất thành công. Không tìm thấy token cũ." });
        }

        try {
            await AuthService.logoutUser(refreshToken); // 💡 Gọi Service để xóa DB
            res.status(200).json({ message: "Đăng xuất thành công." });
        } catch (error) {
            // Ghi log lỗi nhưng vẫn trả về thành công cho client (đã clear cookie)
            console.error("Lỗi xóa token khỏi DB:", error);
            res.status(200).json({ message: "Đăng xuất thành công, nhưng lỗi khi xóa token khỏi DB." });
        }
    },

    /**
     * POST /refresh_tokens: Làm mới Access Token bằng Refresh Token.
     */
    createNewToken: async (req, res, next) => {
        // Lấy token từ Cookie (Ưu tiên) hoặc Body (Fallback)
        const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "Thiếu Refresh Token." });
        }

        try {
            // 💡 Gọi TokenService để xoay vòng token
            const result = await TokenService.refreshTokens(refreshToken);

            // Thiết lập Refresh Token MỚI (Xoay vòng Token)
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: ms(process.env.REFRESH_TOKEN_EXPIRY || '7d'),
                sameSite: 'strict'
            });

            // Trả về Access Token MỚI
            res.status(200).json({
                message: "Token đã được làm mới thành công.",
                accessToken: result.accessToken,
                user: result.user
            });
        } catch (error) {
            // Xóa cookie khi token không hợp lệ/hết hạn để buộc người dùng đăng nhập lại
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });
            return res.status(403).json({ message: error.message });
        }
    },
    /**
     * 💡 HÀM MỚI: Xử lý request đổi mật khẩu
     * PUT /change-password
     */
    changePassword: async (req, res, next) => {
        try {
            // 💡 SỬA LỖI TẠI ĐÂY:
            // Lấy userId TỪ HEADERS (do Gateway tiêm vào), 
            // KHÔNG phải từ req.user.
            const userId = req.headers['x-user-id']; 
            console.log("[AuthController] changePassword called for userId:", userId);
            
            // (Thêm kiểm tra)
            if (!userId) {
                return res.status(401).json({ message: "Không thể xác định người dùng từ Gateway." });
            }

            const { oldPassword, newPassword } = req.body;

            // 2. Gọi Service để xử lý logic
            await AuthService.changePassword(userId, oldPassword, newPassword);

            // 3. Trả về thành công
            res.status(200).json({
                success: true,
                message: "Đổi mật khẩu thành công."
            });

        } catch (error) {
            // ... (phần xử lý lỗi giữ nguyên)
            if (error.message === 'INVALID_OLD_PASSWORD') {
                return res.status(400).json({ message: "Mật khẩu cũ không chính xác." });
            }
            if (error.message === 'USER_NOT_FOUND') {
                 return res.status(404).json({ message: "Không tìm thấy người dùng." });
            }
            next(error);
        }
    },
    /**
     * POST /admin/users: Tạo người dùng đặc biệt (Center Manager) từ Admin.
     * Endpoint này đã được Gateway bảo vệ bằng role (Admin/SuperAdmin).
     */
    /**
     * POST /admin/users: Tạo tài khoản Center Manager.
     */
    createManagerByAdmin: async (req, res) => {
        try {
            // 💡 Nhận thêm username
            const { name, email, username, password, phone_number } = req.body; 
            
            // 1. Validate Username (Best Practice: Regex)
            // Chỉ cho phép chữ thường, số, gạch dưới, gạch ngang. 3-20 ký tự.
            if (username) {
                const usernameRegex = /^[a-z0-9_-]{3,20}$/;
                if (!usernameRegex.test(username)) {
                    return res.status(400).json({ 
                        message: "Username không hợp lệ. (3-20 ký tự, chỉ dùng a-z, 0-9, _, -)" 
                    });
                }
            } else {
                 return res.status(400).json({ message: "Username là bắt buộc." });
            }

            // 2. Gọi Service (Role CENTER_MANAGER sẽ được gán cứng ở Service hoặc ở đây)
            const newManager = await AuthService.createManager({
                name, 
                email, 
                username: username.toLowerCase(), // 💡 Luôn lưu lowercase
                password, 
                phone_number
            });

            res.status(201).json({
                success: true,
                message: "Tạo Center Manager thành công.",
                user: newManager
            });

        } catch (error) {
            console.error("[AuthController] Lỗi khi tạo Center Manager:", error);
            const serviceErrorMessage = error.message || error.response?.data?.message || "";
            
            // Xử lý lỗi trùng lặp từ Prisma
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                const target = error.meta.target.includes('email') ? 'Email' : 
                               error.meta.target.includes('username') ? 'Tên đăng nhập (Username)' : 'Dữ liệu';
                return res.status(409).json({ message: `${target} đã tồn tại.` });
            }
            
            // Xử lý lỗi trùng lặp từ User Service (nếu có)
            if (serviceErrorMessage.includes("409") || serviceErrorMessage.includes("Duplicate")) {
                return res.status(409).json({ message: "Email hoặc Username đã tồn tại trong hệ thống." });
            }

            res.status(500).json({ 
                message: serviceErrorMessage || "Lỗi Server nội bộ." 
            });
        }
    },
    /**
     * PUT /admin/users/:userId/password: Đặt lại mật khẩu cho người dùng bất kỳ.
     * Chỉ được gọi bởi Admin (Gateway đã kiểm soát).
     * KHÔNG yêu cầu mật khẩu cũ.
     */
    adminResetPassword: async (req, res, next) => {
        try {
            const { userId } = req.params; // publicUserId của Center Manager
            const { newPassword } = req.body;
            
            // 1. Kiểm tra input cơ bản
            if (!newPassword) {
                return res.status(400).json({ message: "Mật khẩu mới là bắt buộc." });
            }
            if (!userId) {
                return res.status(400).json({ message: "User ID là bắt buộc." });
            }

            // 2. Gọi Service để xử lý logic: tìm, hash, cập nhật, xóa token
            await AuthService.adminResetPassword(userId, newPassword);

            // 3. Trả về thành công
            res.status(200).json({
                success: true,
                message: "Đã đặt lại mật khẩu thành công."
            });

        } catch (error) {
            console.error("[AuthController] Lỗi khi Admin đặt lại mật khẩu:", error);
            
            if (error.message === 'USER_NOT_FOUND') {
                return res.status(404).json({ message: "Không tìm thấy người dùng." });
            }
            
            // Xử lý lỗi validation (nếu bạn dùng validation middleware ở Auth Service)
            if (error.name === 'ValidationError') {
                 return res.status(400).json({ message: error.message });
            }

            res.status(500).json({ 
                message: "Lỗi Server nội bộ khi đặt lại mật khẩu." 
            });
        }
    },
};