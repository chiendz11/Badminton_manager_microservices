import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext'; // [1] Import AuthContext

const ModalPassBooking = ({ isOpen, onClose, booking, onConfirm }) => {
  // [2] Lấy thông tin user từ Context
  const { user } = useContext(AuthContext);

  const [passPrice, setPassPrice] = useState(booking?.price || 0);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset state khi mở modal mới
  useEffect(() => {
    if (isOpen && booking) {
      setPassPrice(booking.price);
      setPhone(""); // Mặc định để trống hoặc bạn có thể set luôn user?.phone_number nếu muốn
      setNote("");
    }
  }, [isOpen, booking, user]); // Thêm user vào dependency

  if (!isOpen || !booking) return null;

  const handleSubmit = async () => {
    if (!phone.trim()) {
      alert("Vui lòng nhập số điện thoại liên hệ.");
      return;
    }
    if (passPrice < 0) {
      alert("Giá pass không hợp lệ.");
      return;
    }

    setIsLoading(true);
    await onConfirm({
      bookingId: booking.bookingId,
      originalPrice: booking.price,
      passPrice: parseInt(passPrice),
      phone,
      note,
      centerName: booking.center,
      courtTime: booking.court_time,
      date: booking.date
    });
    setIsLoading(false);
  };

  // [3] Hàm xử lý khi bấm "Dùng số của tôi"
  const handleUseMyPhone = () => {
    if (user?.phone_number) {
      setPhone(user.phone_number);
    } else {
      alert("Tài khoản của bạn chưa cập nhật số điện thoại.");
    }
  };

  return (
    // Z-index cao để đè lên Header
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] backdrop-blur-sm flex items-center justify-center p-4">
      
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all scale-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        
        {/* Header Modal */}
        <div className="bg-green-600 p-4 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold text-lg flex items-center">
            <i className="fas fa-ticket-alt mr-2"></i> Đăng tin Pass Sân
          </h3>
          <button 
            onClick={onClose} 
            className="text-white hover:bg-green-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* Info Card */}
          <div className="bg-green-50 border border-green-100 p-4 rounded-lg mb-6 shadow-sm">
            <h4 className="font-bold text-green-800 mb-2 border-b border-green-200 pb-1">
                {booking.center}
            </h4>
            <div className="text-sm text-gray-700 space-y-1">
                <p className="flex items-start">
                    <i className="far fa-clock mt-1 mr-2 text-green-600 w-4"></i>
                    <span className="whitespace-pre-line flex-1">{booking.court_time}</span>
                </p>
                <p className="flex items-center">
                    <i className="far fa-calendar-alt mr-2 text-green-600 w-4"></i>
                    {new Date(booking.date).toLocaleDateString('vi-VN')}
                </p>
                <p className="flex items-center">
                    <i className="fas fa-money-bill-wave mr-2 text-green-600 w-4"></i>
                    <span className="font-bold text-gray-900">
                        {booking.price.toLocaleString('vi-VN')} đ (Giá gốc)
                    </span>
                </p>
            </div>
          </div>

          {/* Form Input */}
          <div className="space-y-5">
            {/* Input Giá */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Giá muốn Pass (VNĐ) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg p-3 pl-3 pr-10 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none font-bold text-gray-800 text-lg"
                  value={passPrice}
                  onChange={(e) => setPassPrice(e.target.value)}
                />
                <span className="absolute right-4 top-3.5 text-gray-500 font-medium">đ</span>
              </div>
              <div className="mt-1 text-xs font-medium">
                {parseInt(passPrice) < booking.price ? (
                    <span className="text-red-500 flex items-center">
                        <i className="fas fa-arrow-down mr-1"></i>
                        Bạn chịu lỗ: {(booking.price - passPrice).toLocaleString('vi-VN')} đ
                    </span>
                ) : parseInt(passPrice) > booking.price ? (
                    <span className="text-blue-600">
                        Giá pass cao hơn giá gốc
                    </span>
                ) : (
                    <span className="text-green-600">Pass bằng giá gốc</span>
                )}
              </div>
            </div>

            {/* Input SĐT - Có chức năng chọn số User */}
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-bold text-gray-700">
                  Số điện thoại liên hệ <span className="text-red-500">*</span>
                </label>
                
                {/* [4] Nút chọn nhanh số điện thoại */}
                {user?.phone_number && (
                  <button 
                    onClick={handleUseMyPhone}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center transition-colors"
                    type="button"
                  >
                    <i className="fas fa-user-circle mr-1"></i>
                    Dùng số của tôi ({user.phone_number})
                  </button>
                )}
              </div>

              <div className="relative">
                 <i className="fas fa-phone absolute left-3 top-3.5 text-gray-400"></i>
                 <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    placeholder="Nhập số điện thoại để người mua gọi..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                 />
              </div>
            </div>

            {/* Input Ghi chú */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Ghi chú / Lời nhắn
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                rows="3"
                placeholder="VD: Có việc bận cần pass gấp, fix nhẹ tiền nước cho anh em..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              ></textarea>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 shrink-0 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2.5 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-300 font-bold shadow-md transition-all flex items-center"
          >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-800 border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
                <i className="fas fa-paper-plane mr-2"></i>
            )}
            Đăng tin ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalPassBooking;