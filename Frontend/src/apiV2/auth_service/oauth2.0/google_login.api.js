/**
 * Đăng nhập bằng Google (OAuth 2.0 Authorization Code)
 */
export function loginWithGoogle() {
    // 💡 SỬA LỖI: Lấy trực tiếp từ Env và có fallback
    const BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost";
    
    // Đảm bảo không bị thừa dấu /
    const cleanBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    
    const googleLoginUrl = `${cleanBaseUrl}/api/auth/google/login`;
    
    console.log("Redirecting to Google Auth:", googleLoginUrl);
    
    window.location.href = googleLoginUrl;
}