// services/auth_service/src/services/email.service.js

import nodemailer from 'nodemailer';
import { EMAIL_USER, EMAIL_PASS, PUBLIC_URL } from '../configs/env.config.js';

const transporter = nodemailer.createTransport({
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
    /**
     * 1. Gửi email xác minh tài khoản (Register)
     */
    sendVerificationEmail: async (toEmail, token) => {
        const verificationLink = `${PUBLIC_URL}/api/auth/verify-user/${token}`;

        const mailOptions = {
            from: `"${process.env.APP_NAME || 'Badminton Booking'}" <${EMAIL_USER}>`,
            to: toEmail,
            subject: 'Xác minh Email Tài khoản của bạn',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563EB;">Chào mừng bạn đến với Booking App! 🏸</h2>
                    <p>Cảm ơn bạn đã đăng ký. Vui lòng xác minh địa chỉ email để bắt đầu đặt sân:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationLink}" style="padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Xác minh Email Ngay
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">Liên kết sẽ hết hạn sau 24 giờ.</p>
                </div>
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
    },

    /**
     * 💡 2. Gửi email Quên mật khẩu (Forgot Password)
     * Hàm này nhận trực tiếp Reset Link đã được tạo từ AuthService
     */
    sendForgotPasswordEmail: async (toEmail, resetLink) => {
        const mailOptions = {
            from: `"${process.env.APP_NAME || 'Badminton Booking'}" <${EMAIL_USER}>`,
            to: toEmail,
            subject: 'Yêu cầu đặt lại mật khẩu',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="https://img.icons8.com/color/96/badminton.png" alt="Badminton Logo" style="width: 64px; height: 64px;">
                    </div>
                    <h2 style="color: #DC2626; text-align: center;">Bạn đã quên mật khẩu?</h2>
                    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <b>${toEmail}</b>.</p>
                    <p>Nếu đúng là bạn, hãy nhấn vào nút bên dưới để tạo mật khẩu mới:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="padding: 12px 24px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);">
                            Đặt lại mật khẩu
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 13px;">
                        ⚠️ Link này chỉ có hiệu lực trong vòng <b>15 phút</b>.
                        <br>Nếu bạn không yêu cầu, vui lòng bỏ qua email này. Mật khẩu của bạn vẫn an toàn.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="text-align: center; color: #999; font-size: 12px;">Booking App Team</p>
                </div>
            `,
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`[EMAIL] Đã gửi email reset password đến ${toEmail}`);
            return true;
        } catch (error) {
            console.error(`[EMAIL ERROR] Gửi email reset pass đến ${toEmail} thất bại:`, error.message);
            // Không throw lỗi để tránh lộ thông tin người dùng, chỉ log lại
            return false;
        }
    },

    /**
     * 💡 3. Hàm gửi email chung (Generic)
     * Để hỗ trợ code cũ hoặc các trường hợp gửi mail linh hoạt khác từ AuthService
     */
    sendEmail: async ({ to, subject, html }) => {
        const mailOptions = {
            from: `"${process.env.APP_NAME || 'Badminton Booking'}" <${EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html,
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`[EMAIL] Đã gửi email chung đến ${to}`);
            return true;
        } catch (error) {
            console.error(`[EMAIL ERROR] Gửi email chung đến ${to} thất bại:`, error.message);
            return false;
        }
    }
};