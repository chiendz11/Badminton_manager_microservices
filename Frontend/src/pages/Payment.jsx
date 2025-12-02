import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { clearAllPendingBookings } from "../apis/booking";
import { Clock, AlertTriangle, User, Phone, Hash, Calendar, DollarSign, QrCode } from "lucide-react";
import SessionExpired from "../components/SessionExpired";
import BookingHeader from "../components/BookingHeader";
import { AuthContext } from "../contexts/AuthContext";
import '../styles/payments.css';
import axiosInstance from "../config/axiosConfig";


const PaymentPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useContext(AuthContext);

  // --- LẤY DỮ LIỆU --
  const userId = user?._id || "000000000000000000000001";
  const centerId = state?.centerId || localStorage.getItem("centerId");
  const initialDate = state?.date || localStorage.getItem("selectedDate");
  const totalPrice = state?.total || Number(localStorage.getItem("totalAmount")) || 0;
  const bookingCode = state?.bookingCode || localStorage.getItem("bookingId");
  // ID Booking MongoDB (để gửi sang PayOS làm nội dung chuyển khoản)
  const bookingIdMongo = state?.bookingIdMongo || localStorage.getItem("currentBookingIdMongo");

  // --- STATE ---
  const [timeLeft, setTimeLeft] = useState(300);
  const [slotGroups, setSlotGroups] = useState([]);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const [isPayOSReady, setIsPayOSReady] = useState(false);

  // --- 1. LOAD SCRIPT PAYOS ---
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js";
    script.async = true;
    script.onload = () => setIsPayOSReady(true); // Đánh dấu sẵn sàng
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []); 

  // --- 2. XỬ LÝ THANH TOÁN PAYOS ---
  const handlePayOSPayment = async () => {
    if (!isPayOSReady || !window.PayOSCheckout) {
      alert("Cổng thanh toán chưa sẵn sàng, vui lòng chờ chút rồi thử lại.");
      return;
    }
    try {
      const API_URL = "http://localhost/api/booking/payment/create-link";
      const response = await axiosInstance.post(API_URL, {
        amount: totalPrice,
        description: "hi",
        returnUrl: window.location.href,
        cancelUrl: window.location.href,
        items: [],
      });

      const data = response.data;

      if (!data.url) {
        alert("Không thể tạo link thanh toán, vui lòng thử lại!");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Lỗi kết nối đến cổng thanh toán.");
    }
  };


  // --- 3. CÁC LOGIC PHỤ TRỢ (ĐẾM NGƯỢC, SLOT, CLEAR DATA) ---
  useEffect(() => {
    const storedGroups = localStorage.getItem("slotGroups");
    if (storedGroups) setSlotGroups(JSON.parse(storedGroups));
  }, []);

  useEffect(() => {
    // Clear booking treo nếu user thoát trang mà chưa thanh toán
    return () => {
      if (!isSuccessModalOpen) {
        clearAllPendingBookings({ userId, centerId }).catch(console.error);
      }
    };
  }, [userId, centerId, isSuccessModalOpen]);

  // Logic đồng hồ đếm ngược 5 phút
  useEffect(() => {
    const getExpiresAt = () => {
      const expiresAtStr = localStorage.getItem("bookingExpiresAt");
      return expiresAtStr ? new Date(expiresAtStr).getTime() : null;
    };

    const startCountdown = () => {
      const expiresAt = getExpiresAt();
      if (expiresAt) {
        const updateCountdown = () => {
          const now = Date.now();
          const remaining = Math.floor((expiresAt - now) / 1000);
          setTimeLeft(remaining > 0 ? remaining : 0);
          if (remaining > 0) requestAnimationFrame(updateCountdown);
        };
        updateCountdown();
      } else {
        const startTime = parseInt(localStorage.getItem("paymentStartTime"), 10) || Date.now();
        const interval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = 300 - elapsed;
          setTimeLeft(remaining > 0 ? remaining : 0);
        }, 250);
        return () => clearInterval(interval);
      }
    };
    return startCountdown();
  }, []);

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    // Thêm dấu ` vào đầu và cuối chuỗi
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (timeLeft === 0) {
    return <SessionExpired message="Phiên thanh toán đã hết hạn. Vui lòng đặt lại sân." />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-green-800 text-white">
      <BookingHeader title="Thanh toán an toàn" onBack={() => navigate("/")} />

      {/* Div ẩn cho PayOS Config */}
      <div id="payos-config" style={{ display: 'none' }}></div>

      <div className="flex flex-1 p-4 lg:p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* CỘT TRÁI: CHỈ CÒN NÚT PAYOS */}
        <div className="flex-1 flex flex-col gap-6 justify-center">

          {/* Cảnh báo thanh toán */}
          <div className="bg-yellow-500 bg-opacity-20 border-l-4 border-yellow-500 text-white rounded-md p-4 flex items-start gap-3">
            <AlertTriangle size={24} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-300 mb-1">Yêu cầu thanh toán</p>
              <p>Vui lòng thanh toán <span className="text-yellow-300 font-bold">{totalPrice.toLocaleString("vi-VN")} đ</span> để giữ sân.</p>
            </div>
          </div>

          {/* Đồng hồ đếm ngược */}
          <div className="flex flex-col items-center justify-center bg-green-900 rounded-lg p-6">
            <div className="flex items-center gap-2 text-gray-300 mb-2">
              <Clock size={18} />
              <p>Hết hạn sau:</p>
            </div>
            <h3 className={`text-5xl font-bold ${timeLeft < 60 ? "text-red-400" : "text-yellow-300"}`}>
              {formatTime(timeLeft)}
            </h3>
          </div>

          {/* NÚT THANH TOÁN CHÍNH */}
          <div className="bg-white rounded-xl shadow-2xl p-8 text-center border-4 border-blue-500">
            <h2 className="text-2xl font-bold text-blue-900 mb-4 flex items-center justify-center gap-2">
              <QrCode size={32} /> Cổng thanh toán PayOS
            </h2>
            <p className="text-gray-600 mb-6">
              Hỗ trợ VietQR, chuyển khoản 24/7. Tự động xác nhận ngay lập tức.
            </p>

            <button
              onClick={handlePayOSPayment}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full py-4 rounded-lg text-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3"
            >
              <span>THANH TOÁN NGAY</span>
              <span className="animate-pulse">→</span>
            </button>

            <p className="text-xs text-gray-400 mt-4 italic">
              *Click để mở mã QR ngân hàng
            </p>
          </div>
        </div>

        {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG */}
        <div className="w-80 hidden md:block">
          <div className="bg-green-900 rounded-lg shadow-lg overflow-hidden sticky top-20">
            <div className="bg-green-700 px-4 py-3 border-b border-green-600">
              <h2 className="font-bold flex items-center gap-2">Đơn hàng</h2>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <User size={18} className="text-green-400" />
                <div>
                  <p className="text-gray-300 text-xs">Khách hàng</p>
                  <p className="font-medium">{user?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-green-400" />
                <div>
                  <p className="text-gray-300 text-xs">SĐT</p>
                  <p className="font-medium">{user?.phone_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Hash size={18} className="text-green-400" />
                <div>
                  <p className="text-gray-300 text-xs">Mã Booking</p>
                  <p className="font-medium">{bookingCode}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-green-400" />
                <div>
                  <p className="text-gray-300 text-xs">Lịch đặt</p>
                  {slotGroups.map((group, idx) => (
                    <p key={idx} className="font-medium text-sm mt-1">
                      {group.courtName} <br /> <span className="text-yellow-200">{group.timeStr}</span>
                    </p>
                  ))}
                </div>
              </div>
              <div className="h-px bg-green-700 my-2"></div>
              <div className="flex items-center gap-3">
                <DollarSign size={18} className="text-yellow-400" />
                <div>
                  <p className="text-gray-300 text-xs">Tổng cộng</p>
                  <p className="font-bold text-yellow-300 text-xl">
                    {totalPrice.toLocaleString("vi-VN")} đ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL THÀNH CÔNG + TỰ ĐỘNG REDIRECT */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center transform scale-100 transition-all">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h3>
            <p className="text-gray-500 mb-6">Hệ thống đã xác nhận lịch đặt sân của bạn.</p>

            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">Tự động chuyển trang sau</p>
              <p className="text-3xl font-bold text-blue-600">{redirectCountdown}s</p>
            </div>

            <button
              onClick={() => navigate("/")}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              Về trang chủ ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;