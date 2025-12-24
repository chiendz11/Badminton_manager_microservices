export const getCookieName = (clientId) => {
    if (clientId === 'ADMIN_UI_ID') return 'admin_refresh_token';
    if (clientId === 'USER_UI_ID') return 'user_refresh_token';
    return 'refreshToken'; // Fallback mặc định
};