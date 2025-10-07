import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../apis/admin.js';
import { Eye, EyeOff, X } from 'lucide-react';
import pic1 from '../image/pic1.jpg';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const togglePassword = () => setShowPassword(!showPassword);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLoginData({ ...loginData, [name]: value });
  };

  const handleLogin = async () => {
    if (!loginData.username || !loginData.password) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    try {
      setError(null);
      setIsLoading(true);
      const response = await loginAdmin(loginData);
      console.log('Login successful:', response);
  
      // Lưu thông tin admin vào localStorage (bao gồm cả id)
      localStorage.setItem('admin', JSON.stringify(response.admin));
  
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <div className="flex min-h-screen">
      {/* Phần bên trái: Hình ảnh */}
      <div className="hidden md:block md:w-1/3 lg:w-1/2">
        <img
          src={pic1}
          alt="Background"
          className="object-cover w-full h-full"
        />
      </div>

      {/* Phần bên phải: Form đăng nhập (mở rộng hơn) */}
      <div className="flex items-center justify-center w-full md:w-2/3 lg:w-1/2 bg-gray-50">
        <div className="w-full max-w-lg px-12 py-16 bg-white rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-green-800 mb-1">
            Đăng nhập - Chủ sân
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            BadMan - Quản lý sân thể thao
          </p>

          {error && (
            <p className="text-center text-red-500 mb-4">{error}</p>
          )}

          <div className="relative mb-4">
            <input
              name="username"
              type="text"
              aria-label="Tên đăng nhập"
              placeholder="Số điện thoại hoặc email"
              className="w-full p-3 border rounded-md focus:outline-none focus:border-green-500 transition-colors"
              value={loginData.username}
              onChange={handleInputChange}
            />
            {loginData.username && (
              <X
                className="absolute right-3 top-3 text-gray-500 cursor-pointer"
                onClick={() =>
                  setLoginData({ ...loginData, username: '' })
                }
                title="Xóa nội dung"
              />
            )}
          </div>

          <div className="relative mb-4">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              aria-label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              className="w-full p-3 border rounded-md focus:outline-none focus:border-green-500 transition-colors"
              value={loginData.password}
              onChange={handleInputChange}
            />
            {showPassword ? (
              <EyeOff
                className="absolute right-3 top-3 text-gray-500 cursor-pointer"
                onClick={togglePassword}
                title="Ẩn mật khẩu"
              />
            ) : (
              <Eye
                className="absolute right-3 top-3 text-gray-500 cursor-pointer"
                onClick={togglePassword}
                title="Hiện mật khẩu"
              />
            )}
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className={`w-full bg-green-600 text-white py-3 rounded-md mb-4 hover:bg-green-700 transition-colors ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Đang đăng nhập...' : 'ĐĂNG NHẬP'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
