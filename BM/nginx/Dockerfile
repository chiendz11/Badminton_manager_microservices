# 1. Sử dụng image cơ sở là Nginx có ModSecurity đã được build sẵn
# Orijinal ModSecurity là một dự án phức tạp, thường nên dùng image đã có sẵn
FROM owasp/modsecurity-crs:nginx

# 2. Xóa cấu hình mặc định (tùy chọn)
RUN rm /etc/nginx/conf.d/default.conf

# 3. Copy file cấu hình WAF (sẽ tạo ở bước 2)
# Đây là cấu hình ModSecurity chính (luật WAF)
COPY ./modsecurity.conf /etc/nginx/modsecurity.d/modsecurity.conf

# 4. Copy file cấu hình Nginx (từ các câu trả lời trước)
# File này sẽ BẬT ModSecurity
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Port 80 đã được khai báo sẵn trong image gốc