import Joi from 'joi';

const passwordRule = Joi.string().min(8).required().messages({
    'string.min': `Mật khẩu phải có ít nhất {#limit} ký tự.`,
    'any.required': `Mật khẩu là bắt buộc.`
});

// Schema cho Đăng ký (Register)
export const registerSchema = Joi.object({
    // Sử dụng regex để đảm bảo username hợp lệ và an toàn hơn
    username: Joi.string()
        .alphanum() // Chỉ cho phép chữ cái và số
        .min(3)
        .max(30)
        .required()
        .messages({
            'string.base': `Tên đăng nhập phải là chữ hoặc số.`,
            'string.alphanum': `Tên đăng nhập chỉ được chứa chữ cái và số.`,
            'string.min': `Tên đăng nhập phải có ít nhất {#limit} ký tự.`,
            'string.max': `Tên đăng nhập không được quá {#limit} ký tự.`,
            'any.required': `Tên đăng nhập là bắt buộc.`
        }),

    email: Joi.string()
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

// Schema cho Đăng nhập (Login)
export const loginSchema = Joi.object({
    username: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': `Email không hợp lệ.`,
            'any.required': `Email là bắt buộc.`
        }),
    password: passwordRule
});