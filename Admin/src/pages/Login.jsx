import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../apiV2/auth_service/auth.api.js';
import { Eye, EyeOff, X } from 'lucide-react';
import pic1 from '../image/pic1.jpg';
import { AuthContext } from '../contexts/AuthContext.jsx';

// 1. IMPORT LOADING SPINNER
import LoadingSpinner from '../components/LoadingSpinner.jsx';

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  // Lấy hàm login từ Context
  const { login } = useContext(AuthContext);

  const togglePassword = () => setShowPassword(!showPassword);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLoginData({ ...loginData, [name]: value });
  };

  const handleLogin = async () => {
    if (!loginData.identifier || !loginData.password) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (!CLIENT_ID) {
      setError('Lỗi cấu hình: Thiếu CLIENT_ID. Vui lòng kiểm tra file .env');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      // 1. Gọi API Login lấy Token
      const response = await loginAdmin({
        identifier: loginData.identifier,
        password: loginData.password,
        clientId: CLIENT_ID,
      });

      console.log('Login API successful:', response);

      // 2. Cập nhật Context (Quan trọng!)
      // Hàm login này sẽ set token cho axios, lấy profile, update state admin
      // Chúng ta chờ nó xong hẳn rồi mới navigate

      await login(response);

      // 3. Chuyển hướng
      // Lúc này state admin đã có, axios đã có token -> Dashboard sẽ load được
      console.log('Navigating to dashboard...');
      navigate('/dashboard', { replace: true }); // Dùng replace để không back lại được login

    } catch (err) {
      console.error("Login Error:", err);
      const errorMessage = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      setError(errorMessage);
      setIsLoading(false); // Chỉ tắt loading khi lỗi
    }
  };


  return (
    <div className="flex min-h-screen">
      {/* 2. THÊM SPINNER TOÀN TRANG */}
      {isLoading && <LoadingSpinner fullPage={true} color="#10B981" />}

      {/* Phần bên trái: Hình ảnh */}
      <div className="hidden md:block md:w-1/3 lg:w-1/2">
        <img
          src={pic1}
          alt="Background"
          className="object-cover w-full h-full"
        />
      </div>

      {/* Phần bên phải: Form đăng nhập */}
      <div className="flex items-center justify-center w-full md:w-2/3 lg:w-1/2 bg-gray-50 p-4 sm:p-8">
        <div className="w-full max-w-lg px-8 py-12 sm:px-12 sm:py-16 bg-white rounded-xl shadow-2xl">
          <h2 className="text-3xl font-extrabold text-green-700 mb-2">
            Đăng nhập - Chủ sân
          </h2>
          <p className="text-md text-gray-500 mb-8">
            BadMan - Quản lý sân cầu lông chuyên nghiệp
          </p>

          {error && (
            <div
              className="flex items-center justify-between p-3 mb-4 text-sm text-red-800 bg-red-100 rounded-lg"
              role="alert"
            >
              <span className="font-medium">{error}</span>
              <X className="w-4 h-4 cursor-pointer" onClick={() => setError(null)} />
            </div>
          )}

          <div className="relative mb-6">
            <input
              name="identifier"
              type="text"
              aria-label="Tên đăng nhập"
              placeholder="Email, Số điện thoại hoặc Tên đăng nhập"
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"
              value={loginData.identifier}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            {loginData.identifier && (
              <X
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                onClick={() =>
                  setLoginData({ ...loginData, identifier: '' })
                }
                title="Xóa nội dung"
              />
            )}
          </div>

          <div className="relative mb-8">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              aria-label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"
              value={loginData.password}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <div
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
              onClick={togglePassword}
              title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </div>
          </div>

          {/* 3. ĐƠN GIẢN HÓA NÚT ĐĂNG NHẬP */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className={`w-full bg-green-600 text-white font-semibold py-4 rounded-lg shadow-lg hover:bg-green-700 transition-all transform hover:scale-[1.01] ${isLoading ? 'opacity-60 cursor-not-allowed' : ''
              }`}
          >
            {isLoading ? 'Đang xử lý...' : 'ĐĂNG NHẬP'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;