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
            // Xử lý lỗi trùng lặp (P2002) từ Prisma
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return res.status(409).json({ message: "Email hoặc Tên đăng nhập đã được sử dụng." });
            }
            // Xử lý lỗi Service cụ thể (ví dụ: lỗi gửi email)
            if (error.message.includes("Không thể gửi email")) {
                return res.status(503).json({ message: "Lỗi dịch vụ email. Vui lòng thử lại sau." });
            }
            // Xử lý lỗi Validation nội bộ từ các Service khác (nếu có, ví dụ: tạo profile)
            if (error.isUserValidation) {
                return res.status(400).json({ message: error.message });
            }
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
};