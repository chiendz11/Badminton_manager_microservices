// services/auth_service/src/services/auth.service.js

import bcrypt from 'bcrypt';
import pkg from '@prisma/client';
const { Role } = pkg;
import prisma from '../prisma.js';
import { add, isPast } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from './email.service.js';
import { TokenService } from './token.service.js';
import { LoginService } from './login.service.js';
import { isEmailFormat } from '../utils/validations.util.js';
import { UserService } from '../clients/user.client.js';
import { publishToExchange, ROUTING_KEYS } from '../clients/rabbitmq.client.js';
import { FRONTEND_URL, JWT_SECRET } from '../configs/env.config.js';
import jwt from 'jsonwebtoken';

// 👇 IMPORT REDIS CLIENT
import redisClient from '../clients/redis.client.js';

const SALT_ROUNDS = 10;
// Thời gian hết hạn của link xác thực email (24 giờ tính bằng giây)
const VERIFY_EMAIL_TTL = 86400; 

export const AuthService = {
    registerUser: async (data) => {
        const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

        let newUser = null;
        // Khai báo token ở đây để catch block có thể truy cập nếu muốn xóa (tùy chọn)
        let verificationToken = null; 

        try {
            // --- BƯỚC 1: TẠO USER TRONG AUTH SERVICE (PG) ---
            newUser = await prisma.user.create({
                data: {
                    email: data.email,
                    username: data.username,
                    passwordHash,
                    role: Role.USER,
                },
                select: { id: true, email: true, username: true, role: true, createdAt: true, isVerified: true }
            });
            
            // 💡 BƯỚC 1.1: TẠO VÀ CẬP NHẬT publicUserId
            const publicUserId = `USER-${newUser.id}`;

            await prisma.user.update({
                where: { id: newUser.id },
                data: { publicUserId: publicUserId }
            });
            newUser.publicUserId = publicUserId;


            // --- BƯỚC 2: GỌI SANG USER SERVICE (MONGO) ĐỂ TẠO PROFILE ---
            const profileData = {
                userId: newUser.publicUserId, 
                name: data.name,
                phone_number: data.phone_number,
                role: newUser.role,
                email: newUser.email,
                username: newUser.username
            };

            await UserService.createProfile(profileData);

            // --- BƯỚC 3: TẠO VERIFICATION TOKEN VÀO REDIS 🟢 ---
            verificationToken = uuidv4();
            
            // Key: "VERIFY_EMAIL:<uuid>" -> Value: "userId"
            // Tự động hủy sau 24h
            await redisClient.set(
                `VERIFY_EMAIL:${verificationToken}`, 
                newUser.id, 
                { EX: VERIFY_EMAIL_TTL }
            );

            // --- BƯỚC 4: GỬI EMAIL ---
            await EmailService.sendVerificationEmail(newUser.email, verificationToken);

            return { ...newUser, publicUserId }; 
            
        } catch (error) {
            // --- LOGIC ROLLBACK ---
            if (newUser && newUser.id) {
                console.warn(`[AuthService-SAGA] Bắt đầu Rollback do lỗi: ${error.message}`);

                try {
                    // 1. Xóa Token trong Redis (Nếu đã tạo) - Dọn dẹp cho sạch
                    if (verificationToken) {
                        await redisClient.del(`VERIFY_EMAIL:${verificationToken}`);
                    }

                    // 2. Xóa User trong Postgres (Quan trọng nhất)
                    await prisma.user.delete({
                        where: { id: newUser.id }
                    });

                    console.warn(`[AuthService-SAGA] Rollback thành công: Đã xóa User.`);

                    // 3. (Nâng cao) Gọi UserService.deleteProfile nếu cần...

                } catch (rollbackError) {
                    console.error(`[AuthService-SAGA] LỖI ROLLBACK NGHIÊM TRỌNG:`, rollbackError);
                }
            }
            throw error;
        }
    },

    authenticateUser: async (identifier, password, clientId, req) => {
        let user;
        const isEmail = isEmailFormat(identifier);
        
        // 1. Tìm User
        if (isEmail) {
            user = await prisma.user.findUnique({ where: { email: identifier } });
        } else {
            user = await prisma.user.findUnique({ where: { username: identifier } });
        }

        // 2. Kiểm tra User tồn tại, Khóa, Active
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
        
        // 💡 Check Verified logic
        if (!user.isVerified) {
            const error = new Error("Vui lòng xác minh email của bạn trước khi đăng nhập.");
            throw Object.assign(error, { statusCode: 403 });
        }

        // 3. So sánh mật khẩu
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            await LoginService.handleFailedLoginAttempt(user.id);
            const error = new Error("Thông tin đăng nhập không chính xác.");
            throw Object.assign(error, { statusCode: 400 });
        }

        // 4. Kiểm tra Client ID và Role
        const client = await prisma.authClient.findUnique({
            where: { clientId: clientId }
        });

        if (!client || !client.isActive) {
            const error = new Error("Ứng dụng (Client) không hợp lệ.");
            throw Object.assign(error, { statusCode: 401 });
        }

        if (!client.allowedRoles.includes(user.role)) {
            const error = new Error("Tài khoản của bạn không có quyền truy cập ứng dụng này.");
            throw Object.assign(error, { statusCode: 403 });
        }

        // 5. Đăng nhập thành công
        await LoginService.handleSuccessfulLogin(user.id);

        // 6. Tạo Tokens và Session
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

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                hasPassword: user.passwordHash !== null
            }
        };
    },

    verifyUserEmail: async (token) => {
        // 🟢 THAY ĐỔI: Sử dụng Redis để lấy userId từ token
        const key = `VERIFY_EMAIL:${token}`;
        const userId = await redisClient.get(key);

        if (!userId) {
            throw new Error("Mã xác minh không hợp lệ hoặc đã hết hạn.");
        }

        // Cập nhật User status trong Postgres
        // (Nếu user đã bị xóa thì Prisma sẽ throw lỗi P2025, ta để nó throw tự nhiên hoặc try-catch nếu muốn custom message)
        await prisma.user.update({
            where: { id: userId },
            data: { isVerified: true }
        });

        // Xóa Token trong Redis để không dùng lại được nữa (One-time use)
        await redisClient.del(key);

        return { message: "Xác minh email thành công!" };
    },

    logoutUser: async (refreshToken) => {
        await prisma.refreshToken.deleteMany({
            where: { token: refreshToken }
        });
        return true;
    },

    changePassword: async (publicUserId, oldPassword, newPassword) => {
        const user = await prisma.user.findUnique({
            where: { publicUserId: publicUserId } 
        });

        if (!user) throw new Error("USER_NOT_FOUND");
        if (!user.passwordHash) throw new Error("PASSWORD_NOT_SET");

        const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isMatch) throw new Error("INVALID_OLD_PASSWORD");

        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id }, 
                data: { passwordHash: newPasswordHash }
            }),
            prisma.refreshToken.deleteMany({
                where: { userId: user.id } 
            })
        ]);

        return true;
    },

    createManager: async (data) => {
        const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
        let newAuthUser = null;

        try {
            const publicUserId = `USER-${uuidv4()}`;

            newAuthUser = await prisma.user.create({
                data: {
                    publicUserId,
                    email: data.email,
                    username: data.username,
                    passwordHash,
                    role: Role.CENTER_MANAGER,
                    isActive: true,
                    isVerified: true, 
                }
            });

            const profileData = {
                userId: publicUserId,
                name: data.name,
                email: data.email,
                username: data.username,
                phone_number: data.phone_number,
                role: Role.CENTER_MANAGER
            };
            
            const newProfile = await UserService.createProfile(profileData);
            
            return {
                ...newAuthUser,
                ...newProfile
            };

        } catch (error) {
            console.error("[AuthService] Lỗi createManager:", error);
            if (newAuthUser) {
                 console.warn(`[AuthService] Rollback: Xóa Auth User ${newAuthUser.id}`);
                 await prisma.user.delete({ where: { id: newAuthUser.id } });
            }
            throw error;
        }
    },

    adminResetPassword: async (publicUserId, newPassword) => {
        const user = await prisma.user.findUnique({
            where: { publicUserId: publicUserId } 
        });

        if (!user) throw new Error("USER_NOT_FOUND");
        
        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id }, 
                data: { passwordHash: newPasswordHash }
            }),
            prisma.refreshToken.deleteMany({
                where: { userId: user.id }
            })
        ]);
        
        console.log(`[AuthService] ✅ Đặt lại mật khẩu thành công cho userId: ${publicUserId}`);
    },

    updateUserStatus: async (userId, isActive) => {
        try {
            const updatedUser = await prisma.user.update({
                where: { publicUserId: userId },
                data: { 
                    isActive: isActive,
                    ...(isActive === false && {
                        refreshTokens: { deleteMany: {} } 
                    })
                }
            });

            const eventPayload = {
                payload: {
                    userId: updatedUser.publicUserId,
                    isActive: updatedUser.isActive
                },
                timestamp: new Date()
            };

            await publishToExchange(ROUTING_KEYS.USER_STATUS_UPDATE_EVENT, eventPayload);

            return updatedUser;
        } catch (error) {
            console.error("[AuthService] Error updating status:", error);
            if (error.code === 'P2025') {
                throw new Error("User not found");
            }
            throw error;
        }
    },

    forgotPassword: async (email) => {
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) return; 
        if (!user.passwordHash) return; 

        // Logic Stateless JWT cho Forgot Password (Không đổi)
        const secret = JWT_SECRET + user.passwordHash;
        const payload = { 
            id: user.id, 
            publicUserId: user.publicUserId 
        };
        const token = jwt.sign(payload, secret, { expiresIn: '15m' });

        const resetLink = `${FRONTEND_URL}/reset-password/${token}/${user.publicUserId}`;
        await EmailService.sendForgotPasswordEmail(email, resetLink);
    },

    resetPassword: async (publicUserId, token, newPassword) => {
        const user = await prisma.user.findUnique({ 
            where: { publicUserId: publicUserId } 
        });

        if (!user) throw new Error("Người dùng không tồn tại.");
        if (!user.passwordHash) throw new Error("Tài khoản này không hỗ trợ đổi mật khẩu.");

        const secret = JWT_SECRET + user.passwordHash;

        try {
            jwt.verify(token, secret);
        } catch (error) {
            throw new Error("Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
        }

        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: newPasswordHash }
            }),
            prisma.refreshToken.deleteMany({
                where: { userId: user.id }
            })
        ]);

        return true;
    }
};