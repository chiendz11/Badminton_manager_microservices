// services/auth_service/src/services/auth.service.js (ĐÃ SỬA ĐỔI)

import bcrypt from 'bcrypt';
import pkg from '@prisma/client';
const { Role } = pkg;
import prisma from '../prisma.js';
import { add, isPast } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from './email.service.js'; // 💡 Cập nhật import
import { TokenService } from './token.service.js'; // 💡 Cập nhật import
import { LoginService } from './login.service.js'; // 💡 Cập nhật import
import { isEmailFormat } from '../utils/validations.util.js';
import { UserService } from '../clients/user.client.js'; // 💡 Cập nhật import

const SALT_ROUNDS = 10;

export const AuthService = {
    registerUser: async (data) => {
        const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

        let newUser = null;

        try {
            // --- BƯỚC 1: TẠO USER TRONG AUTH SERVICE (publicUserId = null ban đầu) ---
            // Chúng ta không thể gán publicUserId ở đây vì cần id vừa được tạo
            newUser = await prisma.user.create({
                data: {
                    email: data.email,
                    username: data.username,
                    passwordHash,
                    role: Role.USER,
                    // publicUserId để null ban đầu
                },
                select: { id: true, email: true, username: true, role: true, createdAt: true, isVerified: true }
            });
            
            // 💡 BƯỚC 1.1: TẠO VÀ CẬP NHẬT publicUserId NGAY LẬP TỨC
            const publicUserId = `USER-${newUser.id}`;

            await prisma.user.update({
                where: { id: newUser.id },
                data: { publicUserId: publicUserId }
            });

            // Cập nhật đối tượng newUser trả về (để BƯỚC 2 dùng)
            newUser.publicUserId = publicUserId;


            // --- BƯỚC 2: GỌI SANG USER SERVICE ĐỂ TẠO PROFILE ---
            const profileData = {
                // CHÚ Ý: Đã đổi từ newUser.id (UUID nội bộ) sang publicUserId
                userId: newUser.publicUserId, 
                name: data.name,
                phone_number: data.phone_number,

                // 💡 THÊM 2 TRƯỜNG "SAO CHÉP" (COPY)
                email: newUser.email,
                username: newUser.username
            };

            // Giả định UserService.createProfile nhận publicUserId
            await UserService.createProfile(profileData);

            // --- BƯỚC 3: TẠO VERIFICATION TOKEN (NẾU BƯỚC 2 THÀNH CÔNG) ---
            const verificationToken = uuidv4();
            const expiresAt = add(new Date(), { hours: 24 });

            await prisma.verificationToken.create({
                data: {
                    userId: newUser.id, // Vẫn dùng UUID nội bộ
                    token: verificationToken,
                    expiresAt: expiresAt,
                }
            });

            // --- BƯỚC 4: GỬI EMAIL (NẾU BƯỚC 2 & 3 THÀNH CÔNG) ---
            await EmailService.sendVerificationEmail(newUser.email, verificationToken);

            // Trả về newUser với publicUserId đã được gán
            return { ...newUser, publicUserId }; 
        } catch (error) {

            // --- SỬA LỖI LOGIC ROLLBACK ---
            if (newUser && newUser.id) {
                // Lỗi xảy ra *sau khi* newUser đã được tạo
                console.warn(`[AuthService-SAGA] Bắt đầu Rollback do lỗi: ${error.message}`);

                try {
                    // 💡 BƯỚC 1: XÓA 'CON' (VerificationToken) TRƯỚC
                    await prisma.verificationToken.deleteMany({
                        where: { userId: newUser.id }
                    });

                    // 💡 BƯỚC 2: XÓA 'CHA' (User) SAU
                    // Rollback sẽ xóa cả user và publicUserId vừa tạo.
                    await prisma.user.delete({
                        where: { id: newUser.id }
                    });

                    console.warn(`[AuthService-SAGA] Rollback (Prisma) thành công: Đã xóa User và Token.`);

                    // 💡 BƯỚC 3 (Nâng cao): Nếu lỗi xảy ra sau bước 2 (gọi UserService)
                    // thì profile "mồ côi" vẫn còn.
                    // Bạn cần thêm logic gọi UserService.deleteProfile(newUser.publicUserId) ở đây.
                    // Ví dụ:
                    // if (error.message.includes('UserService error')) {
                    //     await UserService.deleteProfile(newUser.publicUserId);
                    // }

                } catch (rollbackError) {
                    console.error(`[AuthService-SAGA] LỖI ROLLBACK NGHIÊM TRỌNG:`, rollbackError);
                }
            }
            // --- HẾT LOGIC ROLLBACK ---

            // Ném lỗi gốc để Controller có thể bắt được
            throw error;
        }
    },

    authenticateUser: async (identifier, password, clientId, req) => {
        let user;
        const isEmail = isEmailFormat(identifier);
        console.log("[AuthService] Kiểm tra identifier:", identifier, "isEmail =", isEmail);

        // 1. Tìm User (Giữ nguyên)
        if (isEmail) {
            user = await prisma.user.findUnique({ where: { email: identifier } });
        } else {
            user = await prisma.user.findUnique({ where: { username: identifier } });
        }

        // 2. Kiểm tra User tồn tại, Khóa tài khoản, Active, Verified (Giữ nguyên)
        if (!user || !user.passwordHash) {
            const error = new Error("Thông tin đăng nhập không chính xác.");
            throw Object.assign(error, { statusCode: 400 });
        }
        if (user.lockoutUntil && isPast(user.lockoutUntil)) {
            await LoginService.handleSuccessfulLogin(user.id);
        } else if (user.lockoutUntil && !isPast(user.lockoutUntil)) {
            const error = new Error("Tài khoản của bạn đang bị khóa tạm thời.");
            throw Object.assign(error, { statusCode: 403 });
        }
        if (!user.isActive) {
            const error = new Error("Tài khoản của bạn đã bị vô hiệu hóa.");
            throw Object.assign(error, { statusCode: 403 });
        }
        if (!user.isVerified) {
            const error = new Error("Vui lòng xác minh email của bạn trước khi đăng nhập.");
            throw Object.assign(error, { statusCode: 403 });
        }

        // 3. So sánh mật khẩu (Giữ nguyên)
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            await LoginService.handleFailedLoginAttempt(user.id);
            const error = new Error("Thông tin đăng nhập không chính xác.");
            throw Object.assign(error, { statusCode: 400 });
        }

        // 💡 4. KIỂM TRA CLIENT ID VÀ ROLE (LOGIC MỚI QUAN TRỌNG)
        // Lấy thông tin Client từ DB
        console.log("[AuthService] Kiểm tra clientId:", clientId);
        const client = await prisma.authClient.findUnique({
            where: { clientId: clientId }
        });

        // Nếu Client ID không tồn tại hoặc không active
        if (!client || !client.isActive) {
            const error = new Error("Ứng dụng (Client) không hợp lệ.");
            // 401 Unauthorized - Yêu cầu xác thực (client) bị sai
            throw Object.assign(error, { statusCode: 401 });
        }

        // Nếu vai trò của user không nằm trong danh sách được phép của client
        if (!client.allowedRoles.includes(user.role)) {
            // Đây là lúc USER (role) cố đăng nhập vào Admin UI (client)
            const error = new Error("Tài khoản của bạn không có quyền truy cập ứng dụng này.");
            // 403 Forbidden - Bị cấm (dù đã xác thực đúng)
            throw Object.assign(error, { statusCode: 403 });
        }

        // 5. Đăng nhập thành công (Giữ nguyên)
        await LoginService.handleSuccessfulLogin(user.id);

        // 6. Tạo Tokens và Session (Giữ nguyên)
        const accessToken = TokenService.generateAccessToken(user);
        const refreshToken = await TokenService.createAndStoreRefreshToken(user.id);
        const sessionExpiresAt = add(new Date(), { days: 30 });
        await prisma.session.create({
            data: {
                userId: user.id,
                ipAddress: req.ip || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown',
                expiresAt: sessionExpiresAt,
            }
        });

        // 💡 SỬA LỖI TẠI ĐÂY
        return {
            accessToken,
            refreshToken,
            // Thêm trường 'hasPassword' vào đối tượng user trả về
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                // Báo cho FE biết user này có mật khẩu hay không
                hasPassword: user.passwordHash !== null
            }
        };
    },

    verifyUserEmail: async (token) => {
        // ... (Logic xác minh giữ nguyên) ...
        const tokenRecord = await prisma.verificationToken.findFirst({
            where: { token: token },
            include: { user: true }
        });

        if (!tokenRecord) {
            throw new Error("Mã xác minh không tồn tại.");
        }
        if (tokenRecord.expiresAt < new Date()) {
            await prisma.verificationToken.delete({ where: { id: tokenRecord.id } });
            throw new Error("Mã xác minh đã hết hạn.");
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: tokenRecord.userId },
                data: { isVerified: true }
            }),
            prisma.verificationToken.delete({ where: { id: tokenRecord.id } })
        ]);

        return { message: "Xác minh email thành công!" };
    },

    logoutUser: async (refreshToken) => {
        // ... (Logic đăng xuất giữ nguyên) ...
        await prisma.refreshToken.deleteMany({
            where: { token: refreshToken }
        });
        return true;
    },
    changePassword: async (userId, oldPassword, newPassword) => {
        // 1. Tìm user (Dùng findUnique vì userId là @id và unique)
        // file schema.prisma của bạn xác nhận `id` là @id @db.Uuid
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error("USER_NOT_FOUND");
        }

        // 2. Kiểm tra mật khẩu cũ
        const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isMatch) {
            // Nếu không khớp, ném lỗi để Controller bắt
            throw new Error("INVALID_OLD_PASSWORD");
        }

        // 3. Hash mật khẩu mới
        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // 4. Cập nhật mật khẩu VÀ xóa mọi Refresh Token (Bảo mật)
        // 💡 Sử dụng Transaction để đảm bảo cả 2 cùng thành công
        // (schema.prisma của bạn có model `RefreshToken`)
        await prisma.$transaction([
            // a. Cập nhật pass mới
            prisma.user.update({
                where: { id: userId },
                data: { passwordHash: newPasswordHash }
            }),
            // b. Xóa tất cả Refresh Token của user này
            // (Buộc đăng nhập lại trên các thiết bị khác)
            prisma.refreshToken.deleteMany({
                where: { userId: userId }
            })
        ]);

        return true;
    },
};