import Joi from 'joi';

// --- QUY TẮC MẬT KHẨU TĂNG CƯỜNG BẢO MẬT ---
const passwordRule = Joi.string()
    .min(10) // Tăng độ dài tối thiểu
    .required()
    .trim() // Xóa khoảng trắng thừa ở đầu/cuối
    .regex(/[A-Z]/) // Ít nhất 1 chữ hoa
    .regex(/[a-z]/) // Ít nhất 1 chữ thường
    .regex(/[0-9]/) // Ít nhất 1 chữ số
    .regex(/[!@#$%^&*]/) // Ít nhất 1 ký tự đặc biệt
    .messages({
        'string.min': `Mật khẩu phải có ít nhất 10 ký tự.`,
        'any.required': `Mật khẩu là bắt buộc.`,
        'string.pattern.base': 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số, và 1 ký tự đặc biệt.',
    });
// ---------------------------------------------


// Schema cho Đăng ký (Register)
export const registerSchema = Joi.object({
    // Cho phép ký tự phổ biến hơn trong username như gạch dưới và gạch ngang
    username: Joi.string()
        .trim()
        .regex(/^[a-zA-Z0-9_-]+$/) // Cho phép chữ, số, gạch dưới, gạch ngang
        .min(3)
        .max(30)
        .required()
        .messages({
            'string.base': `Tên đăng nhập phải là chữ hoặc số.`,
            'string.pattern.base': `Tên đăng nhập chỉ được chứa chữ cái, số, gạch dưới, hoặc gạch ngang.`,
            'string.min': `Tên đăng nhập phải có ít nhất {#limit} ký tự.`,
            'string.max': `Tên đăng nhập không được quá {#limit} ký tự.`,
            'any.required': `Tên đăng nhập là bắt buộc.`
        }),

    email: Joi.string()
        .trim()
        .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'vn'] } })
        .required()
        .messages({
            'string.email': `Email không hợp lệ.`,
            'any.required': `Email là bắt buộc.`
        }),

    password: passwordRule,
    confirm_password: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': `Mật khẩu xác nhận không khớp.`,
            'any.required': `Mật khẩu xác nhận là bắt buộc.`
        }),
});


// --- SCHEMA CHO ĐĂNG NHẬP (LOGIN) ĐÃ SỬA LỖI VÀ BẢO MẬT ---
export const loginSchema = Joi.object({
    // Trường identifier cho phép người dùng nhập Email HOẶC Username
    identifier: Joi.alternatives()
        .try(
            // 1. Định dạng Email
            Joi.string().trim().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'vn'] } }),

            // 2. Định dạng Username (Phải khớp với quy tắc khi Đăng ký)
            Joi.string().trim().regex(/^[a-zA-Z0-9_-]+$/).min(3).max(30)
        )
        .required()
        .messages({
            'any.required': 'Tên đăng nhập hoặc Email là bắt buộc.',
            'alternatives.match': 'Tên đăng nhập hoặc Email không đúng định dạng.'
        }),
        
    password: passwordRule
});