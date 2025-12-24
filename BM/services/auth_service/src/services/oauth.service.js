import { OAuth2Client } from 'google-auth-library';
import prisma from '../prisma.js';
import pkg from '@prisma/client';
const { Role } = pkg; 
import { v4 as uuidv4 } from 'uuid';
import { add } from 'date-fns';
import { TokenService } from './token.service.js';
import { UserService } from '../clients/user.client.js';
import {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URL
} from '../configs/env.config.js';

const googleClient = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URL
);

export const OAuthService = {
    getGoogleOAuthURL: (authClientId) => {
        const scopes = [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
        ];

        // authClientId ở đây là string (VD: 'user-app')
        const stateData = JSON.stringify({ clientId: authClientId });
        const stateEncoded = Buffer.from(stateData).toString('base64');

        return googleClient.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            include_granted_scopes: true,
            state: stateEncoded 
        });
    },

    handleGoogleCallback: async (code, req) => {
        let authUser = null;
        let externalIdentity = null;
        
        // Mặc định là 'user-app' nếu không tìm thấy trong state
        let clientIdentifier = 'user-app'; 

        // 1. GIẢI MÃ STATE ĐỂ LẤY CLIENT IDENTIFIER (STRING)
        try {
            const state = req.query.state;
            if (state) {
                const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
                if (decoded.clientId) clientIdentifier = decoded.clientId;
            }
        } catch (e) {
            console.warn("[OAuth] Không thể giải mã state, sử dụng default client id");
        }

        try {
            // 2. TÌM AUTH CLIENT TRONG DB ĐỂ LẤY UUID (QUAN TRỌNG 🔴)
            // Chúng ta phải đổi từ 'user-app' (String) sang 'uuid-gì-đó'
            const authClientRecord = await prisma.authClient.findUnique({
                where: { clientId: clientIdentifier }
            });

            if (!authClientRecord) {
                throw new Error(`Client ID '${clientIdentifier}' không tồn tại trong hệ thống. Vui lòng liên hệ Admin để seed data.`);
            }

            const authClientUUID = authClientRecord.id; // Đây mới là UUID cần dùng

            // ... (Lấy thông tin Google - Giữ nguyên logic cũ) ...
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

            if (!email || !payload.email_verified) {
                throw Object.assign(new Error("Email Google chưa xác thực"), { statusCode: 403 });
            }

            // 3. Xử lý User (Logic cũ)
            externalIdentity = await prisma.externalIdentity.findUnique({
                where: { providerName_providerUserId: { providerName, providerUserId } },
                include: { user: true }
            });

            if (externalIdentity) {
                authUser = externalIdentity.user;
                if (!authUser) {
                     // Clean up rác nếu có identity mà ko có user
                     await prisma.externalIdentity.delete({ where: { id: externalIdentity.id } });
                     throw new Error("Lỗi dữ liệu User.");
                }
            } else {
                authUser = await prisma.user.findUnique({ where: { email } });

                if (authUser) {
                    // Link account cũ
                    await prisma.$transaction([
                        prisma.user.update({
                            where: { id: authUser.id },
                            data: { 
                                isVerified: true, 
                                isActive: true,
                                publicUserId: authUser.publicUserId || `USER-${authUser.id}`
                            }
                        }),
                        prisma.externalIdentity.create({
                            data: { userId: authUser.id, providerName, providerUserId }
                        })
                    ]);
                    authUser = await prisma.user.findUnique({ where: { id: authUser.id } });
                } else {
                    // Tạo mới (Saga)
                    let username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
                    const userExists = await prisma.user.findUnique({ where: { username } });
                    if (userExists) username = `${username}_${uuidv4().substring(0, 8)}`;

                    authUser = await prisma.user.create({
                        data: {
                            email, username, role: Role.USER, isVerified: true, isActive: true
                        }
                    });

                    // Update public ID
                    const publicUserId = `USER-${authUser.id}`;
                    await prisma.user.update({
                        where: { id: authUser.id },
                        data: { publicUserId }
                    });
                    authUser.publicUserId = publicUserId;

                    externalIdentity = await prisma.externalIdentity.create({
                        data: { userId: authUser.id, providerName, providerUserId }
                    });

                    // Gọi User Service
                    try {
                        await UserService.createProfile({
                            userId: authUser.publicUserId,
                            name: nameFromGoogle || username,
                            role: authUser.role,
                            email: authUser.email,
                            username: authUser.username
                        });
                    } catch (serviceError) {
                        // Nếu gọi service fail -> ném lỗi để xuống catch bên dưới rollback
                        throw serviceError; 
                    }
                }
            }

            if (!authUser.isActive) throw Object.assign(new Error("Tài khoản bị khóa"), { statusCode: 403 });

            // 4. TẠO TOKEN
            // 🔴 TRUYỀN UUID (authClientUUID) THAY VÌ STRING
            const refreshToken = await TokenService.createAndStoreRefreshToken(
                authUser.id,     // UUID của User
                authClientUUID   // UUID của AuthClient (đã tìm ở bước 2)
            );
            
            const accessToken = TokenService.generateAccessToken(authUser);

            // Tạo Session
            await prisma.session.create({
                data: {
                    userId: authUser.id,
                    ipAddress: req.ip || 'unknown',
                    userAgent: req.headers['user-agent'] || 'unknown',
                    expiresAt: add(new Date(), { days: 30 }),
                }
            });

            return {
                accessToken, 
                refreshToken,
                user: {
                    id: authUser.id,
                    publicUserId: authUser.publicUserId,
                    username: authUser.username,
                    email: authUser.email,
                    role: authUser.role,
                    hasPassword: authUser.passwordHash !== null 
                }
            };

        } catch (error) {
            // Logic Rollback (Giữ nguyên của bạn)
            if (authUser && externalIdentity && !error.statusCode) { 
                 const isJustCreated = (new Date() - new Date(authUser.createdAt)) < 10000;
                 if (isJustCreated) {
                    console.warn(`[OAuth-SAGA] Rollback user: ${authUser.email}`);
                    try {
                        await prisma.externalIdentity.delete({ where: { id: externalIdentity.id } });
                        await prisma.user.delete({ where: { id: authUser.id } });
                    } catch (rbError) { console.error(`Rollback Error:`, rbError); }
                 }
            }
            console.error("Lỗi OAuth Handler:", error.message);
            throw error;
        }
    }
};