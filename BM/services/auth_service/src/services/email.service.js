// services/auth_service/src/services/emailService.js

import nodemailer from 'nodemailer';
import { EMAIL_USER, EMAIL_PASS, API_GATEWAY_URL } from '../config/env.config.js';

// Khởi tạo Transporter cho Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail', // Sử dụng Gmail
    secure: false, // true for 465, false for other ports
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false // Cần thiết nếu dùng localhost hoặc dev
    }
});

/**
 * Gửi email xác minh tài khoản.
 * @param {string} toEmail - Email người nhận
 * @param {string} token - Token xác minh
 */
export const sendVerificationEmail = async (toEmail, token) => {
    const verificationLink = `${API_GATEWAY_URL}/auth/verificaitons/${token}`;

    const mailOptions = {
        from: `"${process.env.APP_NAME || 'Booking App'}" <${EMAIL_USER}>`,
        to: toEmail,
        subject: 'Xác minh Email Tài khoản của bạn',
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
        // Trong môi trường thực tế, bạn có thể muốn throw error ở đây
        throw new Error("Không thể gửi email xác minh.");
    }
};