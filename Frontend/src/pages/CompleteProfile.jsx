import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
// 💡 THÊM ICON MŨI TÊN QUAY LẠI
import { MdChevronLeft } from 'react-icons/md'; 

// 💡 1. IMPORT API CẬP NHẬT (thật)
import { updateMyProfile } from '../apiV2/user_service/rest/users.api.js';

// 💡 2. Icon quả cầu lông (SVG)
const ShuttlecockIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className="w-12 h-12 text-green-700"
  >
    <path d="M13 3.013C7.45 3.197 3 7.643 3 13.187V17c0 1.657 3.134 3 7 3s7-1.343 7-3v-3.813c0-5.544-4.45-10.004-9.993-10.174L17 3l-4-.014zM11 5.08A8.01 8.01 0 0115 5.01v2.103a6.002 6.002 0 00-4 0V5.08zM9 5.01c.84.062 1.652.21 2.42.434C10.63 6.304 10 7.4 10 8.587v1.604c-1.898.344-3.513 1.077-4.634 2.103A8.13 8.13 0 015 9.187C5 6.864 6.79 5.01 9 5.01z" />
    <path d="M11 11.29V17c0 1.105 1.79 2 4 2s4-.895 4-2v-5.71a8.13 8.13 0 01-1.366 3.106C16.513 15.423 14.898 16.156 13 16.5v-1.604c0-1.186-.63-2.282-1.58-3.14a8.01 8.01 0 01-.42-1.466z" />
  </svg>
);

const CompleteProfilePage = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const { user, refreshUser } = useContext(AuthContext);
    const navigate = useNavigate();

    // 💡 HÀM QUAY LẠI ĐÃ SỬA: Chuyển hướng tuyệt đối và an toàn
    const handleGoBack = () => {
        // SỬ DỤNG REPLACE: TRUE ĐỂ LÀM SẠCH LỊCH SỬ
        // và đảm bảo người dùng được đưa về trang an toàn nhất (Trang Chủ).
        navigate('/', { replace: true }); 
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!/^\d{10}$/.test(phoneNumber)) {
             setError('Vui lòng nhập số điện thoại hợp lệ (10 số).');
             return;
        }

        setLoading(true);
        setError('');

        try {
            await updateMyProfile({ phone_number: phoneNumber });
            await refreshUser(); 
            // Sau khi hoàn thành, chuyển hướng an toàn
            navigate('/profile', { replace: true }); 
        } catch (err) {
            setLoading(false);
            setError(err.response?.data?.message || err.message || "Lỗi cập nhật hồ sơ.");
        }
    };

    return (
      <div className="flex items-center justify-center min-h-screen bg-green-50 font-inter">
        <div className="relative w-full max-w-md p-8 m-4 bg-white rounded-2xl shadow-xl">
          
            {/* 💡 NÚT QUAY LẠI MỚI (sử dụng handleGoBack đã sửa) */}
            <button
                onClick={handleGoBack}
                className="absolute top-4 left-4 p-2 text-gray-500 hover:text-green-600 transition duration-150 rounded-full hover:bg-green-50"
                aria-label="Quay lại"
            >
                <MdChevronLeft className="w-8 h-8" />
            </button>
            {/* HẾT NÚT QUAY LẠI */}

          <div className="flex flex-col items-center">
            <ShuttlecockIcon />
            <h2 className="mt-4 text-3xl font-bold text-center text-green-800">
              Hoàn thành Hồ sơ
            </h2>
            <p className="mt-2 text-center text-gray-600">
                Chào mừng, <b className="text-gray-800">{user?.name || 'bạn'}</b>!
            </p>
            <p className="mt-1 text-sm text-center text-gray-500">
                Vui lòng cung cấp số điện thoại để hoàn tất đăng ký.
            </p>
          </div>
          
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div>
                    <label 
                      htmlFor="phone_number" 
                      className="block text-sm font-semibold text-gray-700"
                    >
                      Số điện thoại
                    </label>
                    <div className="mt-2">
                      <input
                          id="phone_number"
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="0123456789"
                          required
                          className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                </div>
                
                {error && (
                  <div className="p-3 text-center text-red-800 bg-red-100 border border-red-300 rounded-lg">
                    {error}
                  </div>
                )}
                
                <div>
                  <button 
                    type="submit" 
                    disabled={loading} 
                    className="flex items-center justify-center w-full px-4 py-3 font-semibold text-white transition duration-300 bg-green-600 rounded-lg shadow-md h-12 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      'Lưu và Tiếp tục'
                    )}
                  </button>
                </div>
            </form>
        </div>
      </div>
    );
};

export default CompleteProfilePage;