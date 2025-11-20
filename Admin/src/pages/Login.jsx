import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../apis_v2/auth_serivce/auth.api.js';
import { Eye, EyeOff, X } from 'lucide-react';
import pic1 from '../image/pic1.jpg'; 
import { AuthContext } from '../contexts/AuthContext.jsx'; 

// 💡 1. IMPORT LOADING SPINNER
import LoadingSpinner from '../components/LoadingSpinner.jsx'; // Giả sử path là components/LoadingSpinner.jsx

// Lấy Client ID từ biến môi trường
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshAdmin } = useContext(AuthContext);

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
      setIsLoading(true); // 💡 SPINNER TOÀN TRANG SẼ KÍCH HOẠT TẠI ĐÂY
      
      const response = await loginAdmin({
          identifier: loginData.identifier,
          password: loginData.password,
          clientId: CLIENT_ID, 
      });

      console.log('Login successful:', response);

      await refreshAdmin(); 
      
      navigate('/dashboard'); 
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      setError(errorMessage);
      setIsLoading(false); // 💡 Tắt spinner nếu có lỗi
    } 
    // Không cần finally(setIsLoading(false)) vì trang sẽ chuyển đi
  };


  return (
    <div className="flex min-h-screen">
      {/* 💡 2. THÊM SPINNER TOÀN TRANG */}
      {/* Nó sẽ che toàn bộ màn hình khi isLoading = true */}
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
            />
            <div 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
              onClick={togglePassword}
              title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </div>
          </div>

          {/* 💡 3. ĐƠN GIẢN HÓA NÚT ĐĂNG NHẬP */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className={`w-full bg-green-600 text-white font-semibold py-4 rounded-lg shadow-lg hover:bg-green-700 transition-all transform hover:scale-[1.01] ${
              isLoading ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {/* Bỏ logic spinner bên trong, chỉ cẩn disable là đủ */}
            ĐĂNG NHẬP
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;