// services/auth_service/src/services/email.service.js (ĐÃ SỬA ĐỔI)

import nodemailer from 'nodemailer';
import { EMAIL_USER, EMAIL_PASS, PUBLIC_URL } from '../configs/env.config.js';

const transporter = nodemailer.createTransport({
    // ... (Cấu hình transporter giữ nguyên) ...
    service: 'gmail', 
    secure: false, 
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

export const EmailService = {
    sendVerificationEmail: async (toEmail, token) => {
        const verificationLink = `${PUBLIC_URL}/api/auth/verify-user/${token}`;

        const mailOptions = {
            // ... (Cấu hình mailOptions giữ nguyên) ...
            from: `"${process.env.APP_NAME || 'Booking App'}" <${EMAIL_USER}>`,
            to: toEmail,
            subject: 'Xác minh Email Tài khoản của bạn',
            // ... (HTML body giữ nguyên) ...
            html: `
                <h1>Chào mừng bạn đã đến với Booking App!</h1>
                <p>Vui lòng xác minh địa chỉ email của bạn bằng cách nhấp vào liên kết dưới đây:</p>
                <a href="${verificationLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                    Xác minh Email
                </a>
                <p>Liên kết sẽ hết hạn sau 24 giờ. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
            `,
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`[EMAIL] Đã gửi email xác minh thành công đến ${toEmail}`);
            return true;
        } catch (error) {
            console.error(`[EMAIL ERROR] Gửi email đến ${toEmail} thất bại:`, error.message);
            throw new Error("Không thể gửi email xác minh.");
        }
    }
};