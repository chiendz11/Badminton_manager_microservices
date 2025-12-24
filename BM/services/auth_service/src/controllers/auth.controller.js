// services/auth_service/src/controllers/auth.controller.js

import { AuthService } from '../services/auth.service.js';
import { TokenService } from '../services/token.service.js';
import { Prisma } from '@prisma/client';
import ms from 'ms';
import { getCookieName } from '../utils/auth.util.js';
import { REFRESH_TOKEN_EXPIRY } from '../configs/env.config.js';

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
     * POST /sessions: Đăng nhập
     * 🟢 CẬP NHẬT: Xử lý Client ID chặt chẽ
     */
    createSession: async (req, res, next) => {
        const { identifier, password, clientId } = req.body;

        try {
            // 1. Validate ClientId
            if (!clientId) {
                return res.status(400).json({ message: "ClientId (Application ID) là bắt buộc." });
            }

            // 2. Gọi Service
            const result = await AuthService.authenticateUser(
                identifier,
                password,
                clientId, // Truyền clientId xuống để validate Role và binding Token
                req
            );

            // 3. Đặt tên Cookie động (Để Admin và User App không ghi đè cookie của nhau trên localhost)
            let cookieName = 'refreshToken';
            if (clientId === 'ADMIN_UI_ID') cookieName = 'admin_refresh_token'; // Ví dụ ID
            else if (clientId === 'USER_UI_ID') cookieName = 'user_refresh_token';

            res.cookie(cookieName, result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
                sameSite: 'strict',
                path: '/'
            });

            res.status(200).json({
                message: "Đăng nhập thành công!",
                accessToken: result.accessToken,
                user: result.user
            });
        } catch (error) {
            if ([400, 401, 403].includes(error.statusCode)) {
                return res.status(error.statusCode).json({ message: error.message });
            }
            next(error);
        }
    },

    /**
     * DELETE /sessions: Đăng xuất
     */
    deleteSession: async (req, res, next) => {
        // 🟢 2. LẤY CLIENT ID TỪ HEADER ĐỂ XÓA ĐÚNG COOKIE
        const clientId = req.headers['x-client-id'];
        const cookieName = getCookieName(clientId);

        const refreshToken = req.cookies?.[cookieName]; // Chỉ lấy đúng cookie này

        // Xóa cookie cụ thể
        res.clearCookie(cookieName, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        // (Optional) Xóa cookie fallback cho chắc
        res.clearCookie('refreshToken');

        if (!refreshToken) {
            return res.status(200).json({ message: "Đăng xuất thành công (No token)." });
        }

        try {
            await AuthService.logoutUser(refreshToken);
            res.status(200).json({ message: "Đăng xuất thành công." });
        } catch (error) {
            res.status(200).json({ message: "Đăng xuất thành công." });
        }
    },

    /**
     * POST /refresh_tokens: Làm mới Access Token
     * 🟢 QUAN TRỌNG NHẤT: SỬA LỖI CONFIICT SESSION TẠI ĐÂY
     */
    createNewToken: async (req, res, next) => {
        try {
            // 1. Lấy Client ID từ Header (Frontend Axios đã gửi lên)
            const clientId = req.headers['x-client-id'];

            if (!clientId) {
                // Nếu không có Client ID, từ chối ngay lập tức để tránh đoán mò cookie
                return res.status(400).json({ message: "Missing x-client-id header." });
            }

            // 2. Xác định tên cookie cần đọc
            const cookieName = getCookieName(clientId);

            // 3. 🟢 CHỈ ĐỌC COOKIE CỦA CLIENT ĐÓ. TUYỆT ĐỐI KHÔNG FALLBACK SANG CÁI KHÁC.
            // Nếu là User App -> Chỉ đọc user_refresh_token. Nếu không có -> Coi như chưa login.
            const refreshToken = req.cookies?.[cookieName] || req.body.refreshToken;

            if (!refreshToken) {
                return res.status(401).json({ message: "Phiên đăng nhập hết hạn hoặc không tồn tại." });
            }

            // 4. Gọi Service (Service sẽ check thêm binding clientId trong DB nữa cho chắc)
            const result = await TokenService.refreshTokens(refreshToken, clientId);

            // 5. Set lại cookie mới (Token Rotation) với đúng tên cũ
            res.cookie(cookieName, result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: ms(REFRESH_TOKEN_EXPIRY || '7d'),
                sameSite: 'strict',
                path: '/'
            });

            res.status(200).json({
                message: "Token refreshed.",
                accessToken: result.accessToken,
                user: result.user
            });

        } catch (error) {
            // Nếu lỗi, xóa đúng cookie của client đó
            const clientId = req.headers['x-client-id'];
            if (clientId) {
                res.clearCookie(getCookieName(clientId));
            }
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
                return res.status(404).json({ message: "[Change Password] Không tìm thấy người dùng." });
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
                return res.status(404).json({ message: "[Auth Service. admin Reset Password] Không tìm thấy người dùng." });
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
    updateUserStatus: async (req, res) => {
        try {
            const { userId } = req.params;
            const { isActive } = req.body;

            // Validate cơ bản
            if (typeof isActive !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: "isActive must be a boolean (true/false)"
                });
            }

            const result = await AuthService.updateUserStatus(userId, isActive);

            res.status(200).json({
                success: true,
                message: `User status updated to ${isActive ? 'ACTIVE' : 'INACTIVE'}`,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    },

    /**
     * 💡 [HÀM MỚI] POST /forgot-password
     */
    forgotPassword: async (req, res, next) => {
        try {
            const { email } = req.body;
            await AuthService.forgotPassword(email);

            // Luôn trả về 200 message chung chung để bảo mật
            res.status(200).json({
                message: "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu."
            });
        } catch (error) {
            // Log lỗi thật ở server
            console.error("[AuthController] Forgot Password Error:", error);
            // Vẫn trả về success cho client
            res.status(200).json({
                message: "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu."
            });
        }
    },

    /**
     * 💡 [SỬA HÀM] POST /reset-password
     * Đổi tên từ changePassword (cũ/sai) hoặc thêm mới nếu chưa có
     */
    /**
     * 💡 [ĐÃ SỬA] POST /reset-password
     * Đặt lại mật khẩu (Public Route - Không dùng Header x-user-id)
     */
    resetPassword: async (req, res, next) => {
        try {
            // 💡 SỬA LỖI TẠI ĐÂY:
            // Vì là Public Route, Gateway KHÔNG gán header x-user-id.
            // Ta phải lấy userId từ body (do Frontend gửi lên: { token, userId, newPassword })
            const { token, userId, newPassword } = req.body;

            // Kiểm tra đầu vào cơ bản (Dù Joi đã validate, check lại cho chắc cũng không sao)
            if (!token || !userId || !newPassword) {
                return res.status(400).json({
                    message: "Thiếu thông tin bắt buộc (token, userId, hoặc mật khẩu mới)."
                });
            }

            // Gọi Service
            await AuthService.resetPassword(userId, token, newPassword);

            res.status(200).json({
                success: true,
                message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."
            });
        } catch (error) {
            console.error("[AuthController] Reset Password Error:", error);

            // 💡 QUAN TRỌNG: Trả về 400 (Bad Request) thay vì 401/500
            // Để Frontend hiển thị thông báo lỗi đỏ ngay lập tức,
            // tránh kích hoạt cơ chế Auto-Refresh Token gây vòng lặp.

            // Nếu là lỗi nghiệp vụ từ Service ném ra
            if (error.message === "INVALID_TOKEN" || error.message === "INVALID_USER" || error.message.includes("hết hạn")) {
                return res.status(400).json({
                    message: "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."
                });
            }

            // Các lỗi khác
            res.status(400).json({
                message: "Không thể đặt lại mật khẩu. Vui lòng thử lại sau."
            });
        }
    },
};