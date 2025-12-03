# Sử dụng Image WAF chính chủ
FROM owasp/modsecurity-crs:nginx

# 1. Cấu hình Nginx (Proxy)
COPY nginx.conf /etc/nginx/templates/conf.d/default.conf.template

# 2. 💡 Cấu hình WAF (Ghi đè luật chặn nhầm)
# QUAN TRỌNG: Copy vào thư mục rules và đặt tên RESPONSE-999... 
# để đảm bảo nó chạy SAU các luật mặc định và ghi đè được chúng.
COPY modsecurity-override.conf /opt/owasp-crs/rules/RESPONSE-999-exclusion.conf

# 3. Quyền hạn cho Log
USER root
RUN touch /var/log/modsec_audit.log && chown nginx:nginx /var/log/modsec_audit.log
USER nginx