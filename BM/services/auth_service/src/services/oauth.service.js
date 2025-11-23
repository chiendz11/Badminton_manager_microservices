import { OAuth2Client } from 'google-auth-library';
import prisma from '../prisma.js';
import pkg from '@prisma/client';
const { Role, Prisma } = pkg;
import { v4 as uuidv4 } from 'uuid';
import { add } from 'date-fns';
import { TokenService } from './token.service.js';
import {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URL
} from '../configs/env.config.js';

import { UserService } from '../clients/user.client.js'; // 💡 Cập nhật import


// Khởi tạo Google Client
const googleClient = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URL
);

export const OAuthService = {
    getGoogleOAuthURL: (state) => {
        const scopes = [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
        ];

        return googleClient.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            include_granted_scopes: true,
            state: state
        });
    },

    handleGoogleCallback: async (code, req) => {
        let authUser = null;
        let externalIdentity = null;

        try {
            // ... (Bước 1, 2, 3: Lấy thông tin Google) ...
            const { tokens } = await googleClient.getToken(code);
            const ticket = await googleClient.verifyIdToken({
                idToken: tokens.id_token,
                audience: GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            const providerName = 'google';
            const providerUserId = payload.sub;
            const email = payload.email;
            const nameFromGoogle = payload.name;

            // 4. KIỂM TRA QUAN TRỌNG
            if (!email || !payload.email_verified) {
                const error = new Error("Tài khoản Google này phải có email đã được xác minh.");
                throw Object.assign(error, { statusCode: 403 });
            }

            // 5. Tìm kiếm ExternalIdentity
            externalIdentity = await prisma.externalIdentity.findUnique({
                where: {
                    providerName_providerUserId: {
                        providerName,
                        providerUserId,
                    },
                },
                include: { user: true }
            });

            if (externalIdentity) {
                // 5a. Đã tìm thấy: Đây là người dùng cũ
                authUser = externalIdentity.user;
                if (!authUser) {
                    await prisma.externalIdentity.delete({ where: { id: externalIdentity.id } });
                    throw new Error("Lỗi dữ liệu: Không tìm thấy người dùng được liên kết, đã xóa liên kết rác.");
                }
            } else {
                // 5b. Không tìm thấy: Đây là lần đầu dùng Google
                authUser = await prisma.user.findUnique({ where: { email } });

                if (authUser) {
                    // Email đã tồn tại. (Người dùng cũ, nhưng chưa liên kết Google)
                    // Liên kết Google và cập nhật trạng thái đã xác minh.

                    await prisma.$transaction([
                        prisma.user.update({
                            where: { id: authUser.id },
                            // Đảm bảo publicUserId đã tồn tại, nếu chưa thì tạo
                            data: { 
                                isVerified: true, 
                                isActive: true,
                                publicUserId: authUser.publicUserId || `USER-${authUser.id}`
                            }
                        }),
                        prisma.externalIdentity.create({
                            data: {
                                userId: authUser.id,
                                providerName,
                                providerUserId,
                            }
                        }),
                        prisma.verificationToken.deleteMany({
                            where: { userId: authUser.id }
                        })
                    ]);
                    // Cập nhật lại đối tượng authUser để dùng cho bước sau
                    authUser = await prisma.user.findUnique({ where: { id: authUser.id } });
                    
                    authUser.isVerified = true;
                    authUser.isActive = true;

                } else {
                    // Email không tồn tại -> Tạo người dùng mới
                    let username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
                    const userExists = await prisma.user.findUnique({ where: { username } });
                    if (userExists) {
                        username = `${username}_${uuidv4().substring(0, 8)}`;
                    }

                    // 💡 --- SAGA BẮT ĐẦU (ĐÃ SỬA) ---
                    // BƯỚC 1: TẠO AUTH USER (PRISMA)
                    authUser = await prisma.user.create({
                        data: {
                            email: email,
                            username: username,
                            role: Role.USER,
                            isVerified: true,
                            isActive: true,
                            // publicUserId để null ban đầu
                        }
                    });

                    // 💡 BƯỚC 1.1: TẠO VÀ CẬP NHẬT publicUserId NGAY LẬP TỨC
                    const publicUserId = `USER-${authUser.id}`;

                    await prisma.user.update({
                        where: { id: authUser.id },
                        data: { publicUserId: publicUserId }
                    });

                    // Cập nhật đối tượng authUser (để dùng trong BƯỚC 2)
                    authUser.publicUserId = publicUserId;


                    // 💡 BƯỚC 1.5: TẠO EXTERNAL IDENTITY (PRISMA)
                    externalIdentity = await prisma.externalIdentity.create({
                        data: {
                            userId: authUser.id,
                            providerName: providerName,
                            providerUserId: providerUserId,
                        }
                    });

                    // 💡 BƯỚC 2: GỌI TẠO USER PROFILE (MONGOOSE)
                    const profileData = {
                        // CHÚ Ý: Đã đổi từ authUser.id (UUID nội bộ) sang publicUserId
                        userId: authUser.publicUserId, 
                        name: nameFromGoogle || username,
                        phone_number: null, // Vẫn là null (vì Google không cấp)

                        // 💡 THÊM 2 TRƯỜNG "SAO CHÉP" (COPY)
                        email: authUser.email,
                        username: authUser.username
                    };

                    await UserService.createProfile(profileData);
                }
            }

            // 6. KIỂM TRA CUỐI
            if (!authUser.isActive) {
                const error = new Error("Tài khoản của bạn đã bị vô hiệu hóa bởi quản trị viên.");
                throw Object.assign(error, { statusCode: 403 });
            }

            // 7. Tạo session và token
            const refreshToken = await TokenService.createAndStoreRefreshToken(authUser.id);
            const sessionExpiresAt = add(new Date(), { days: 30 });
            await prisma.session.create({
                data: {
                    userId: authUser.id,
                    ipAddress: req.ip || 'unknown',
                    userAgent: req.headers['user-agent'] || 'unknown',
                    expiresAt: sessionExpiresAt,
                }
            });

            // 8. Trả về
            return {
                refreshToken,
                user: {
                    id: authUser.id, // Vẫn là ID nội bộ cho auth service
                    publicUserId: authUser.publicUserId, // 💡 Trả về publicUserId
                    username: authUser.username,
                    email: authUser.email,
                    role: authUser.role
                }
            };

        } catch (error) {
            // 💡 --- SAGA ROLLBACK (ĐÃ SỬA) ---

            // 'authUser && externalIdentity' là điều kiện an toàn nhất
            // để biết chúng ta đang ở trong luồng SAGA "Tạo User Mới"
            if (authUser && externalIdentity) {
                console.warn(`[OAuthService-SAGA] Bắt đầu Rollback do lỗi: ${error.message}`);
                try {
                    // 💡 BƯỚC 1: Xóa 'con' (ExternalIdentity) trước
                    await prisma.externalIdentity.delete({
                        where: { id: externalIdentity.id }
                    });
                    
                    // 💡 BƯỚC 2: Xóa 'cha' (User) sau (tự động xóa publicUserId)
                    await prisma.user.delete({
                        where: { id: authUser.id }
                    });
                    
                    console.warn(`[OAuthService-SAGA] Rollback thành công: Đã xóa User (id: ${authUser.id}) và ExternalIdentity.`);
                    
                    // 💡 BƯỚC 3 (Nâng cao): Thêm logic Rollback cho UserService.deleteProfile(authUser.publicUserId)
                    // nếu lỗi xảy ra sau BƯỚC 2 (gọi UserService).

                } catch (rollbackError) {
                    console.error(`[OAuthService-SAGA] LỖI ROLLBACK NGHIÊM TRỌNG:`, rollbackError);
                }
            }

            console.error("Lỗi trong OAuthService.handleGoogleCallback:", error);
            throw error;
        }
    }
};