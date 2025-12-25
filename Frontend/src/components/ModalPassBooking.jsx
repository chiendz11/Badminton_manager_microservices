import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext'; 
// 👇 1. Import API vào đây luôn
import { addPassBookingPost } from "../apiV2/booking_service/rest/booking";

// Đổi tên prop onConfirm thành onSuccess cho đúng ngữ nghĩa
const ModalPassBooking = ({ isOpen, onClose, booking, onSuccess }) => {
  const { user } = useContext(AuthContext); 

  const [passPrice, setPassPrice] = useState(0);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reset state
  useEffect(() => {
    if (isOpen && booking) {
      setPassPrice(booking.price);
      setPhone(user?.phone_number || ""); 
      setNote("");
    }
  }, [isOpen, booking?.bookingId]); 

  if (!isOpen || !booking) return null;

  const handleSubmit = async () => {
    // Validate
    if (!phone.trim()) {
      alert("Vui lòng nhập số điện thoại liên hệ.");
      return;
    }
    if (passPrice < 0) {
      alert("Giá pass không hợp lệ.");
      return;
    }

    setIsLoading(true);

    try {
      // 👇 2. GỌI API TRỰC TIẾP TẠI ĐÂY
      const finalDescription = `[LH: ${phone}] ${note}`;
      
      await addPassBookingPost({
        bookingId: booking.bookingId,
        resalePrice: Number(passPrice),
        desc: finalDescription
      });

      // 👇 3. Thành công -> Báo cho cha biết để reload
      alert("Đăng tin Pass Sân thành công!");
      onSuccess(); // Gọi hàm refresh của cha
      onClose();   // Đóng modal

    } catch (error) {
      console.error("Lỗi khi đăng pass sân:", error);
      const msg = error.response?.data?.message || "Có lỗi xảy ra.";
      alert(`Đăng tin thất bại: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseMyPhone = () => {
    if (user?.phone_number) setPhone(user.phone_number);
    else alert("Tài khoản chưa cập nhật SĐT.");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[9999] backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all scale-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold text-lg flex items-center">
            <i className="fas fa-bullhorn mr-2"></i> Đăng tin Pass Sân
          </h3>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* BODY (Giữ nguyên giao diện cũ) */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
           {/* ... Giữ nguyên phần hiển thị thông tin sân và form nhập liệu ... */}
           {/* (Phần code giao diện bên trong không thay đổi so với trước) */}
           
           <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6 shadow-sm">
                <h4 className="font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">{booking.center}</h4>
                <div className="text-sm text-gray-700 space-y-1">
                    <p className="flex items-start"><i className="far fa-clock mt-1 mr-2 text-yellow-600 w-4"></i><span className="whitespace-pre-line flex-1">{booking.court_time}</span></p>
                    <p className="flex items-center"><i className="far fa-calendar-alt mr-2 text-yellow-600 w-4"></i>{new Date(booking.date).toLocaleDateString('vi-VN')}</p>
                    <p className="flex items-center"><i className="fas fa-tag mr-2 text-yellow-600 w-4"></i><span className="font-bold text-gray-900">{booking.price?.toLocaleString('vi-VN')} đ (Giá gốc)</span></p>
                </div>
            </div>

            <div className="space-y-5">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Giá muốn Pass (VNĐ) <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <input type="number" className="w-full border border-gray-300 rounded-lg p-3 pl-3 pr-10 focus:ring-2 focus:ring-yellow-400 outline-none font-bold text-gray-800 text-lg" value={passPrice} onChange={(e) => setPassPrice(e.target.value)} />
                        <span className="absolute right-4 top-3.5 text-gray-500 font-medium">đ</span>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-end mb-1">
                        <label className="block text-sm font-bold text-gray-700">SĐT Liên hệ <span className="text-red-500">*</span></label>
                        {user?.phone_number && <button onClick={handleUseMyPhone} className="text-xs text-blue-600 hover:underline" type="button">Dùng số của tôi</button>}
                    </div>
                    <div className="relative">
                        <i className="fas fa-phone absolute left-3 top-3.5 text-gray-400"></i>
                        <input type="text" className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-yellow-400 outline-none" placeholder="Nhập số điện thoại..." value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Ghi chú / Lời nhắn</label>
                    <textarea className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-yellow-400 outline-none resize-none" rows="3" placeholder="VD: Fix nhẹ tiền nước..." value={note} onChange={(e) => setNote(e.target.value)}></textarea>
                </div>
            </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 shrink-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors">Hủy bỏ</button>
          <button onClick={handleSubmit} disabled={isLoading} className="px-6 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-bold shadow-md transition-all flex items-center">
            {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> : <i className="fas fa-check-circle mr-2"></i>}
            Xác nhận đăng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalPassBooking;