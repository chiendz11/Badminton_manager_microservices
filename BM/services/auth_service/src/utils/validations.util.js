// src/utils/validation.js

// Giả định bạn đã cài đặt thư viện 'validator'
import validator from 'validator';

/**
 * Kiểm tra xem chuỗi có đúng định dạng email hợp lệ hay không.
 * Hàm tiện ích thuần túy, không chứa logic nghiệp vụ.
 * @param {string} str - Chuỗi cần kiểm tra (identifier)
 * @returns {boolean}
 */
export const isEmailFormat = (str) => {
    if (!str || typeof str !== 'string') {
        return false;
    }
    // Sử dụng validator để kiểm tra định dạng email chuẩn xác
    return validator.isEmail(str);
};