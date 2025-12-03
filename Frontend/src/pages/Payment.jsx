import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPayOSPayment, checkPaymentStatus, getBookingStatusFromBookingId } from "../apiV2/booking_service/rest/booking";
import { Copy, Clock, AlertTriangle, User, Phone, Hash, Loader, QrCode } from "lucide-react";
import SessionExpired from "../components/SessionExpired";
import BookingHeader from "../components/BookingHeader";
import { AuthContext } from "../contexts/AuthContext";
import { fetchUserInfo } from "../apis/users";
import '../styles/payments.css';

const PaymentPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user, setUser } = useContext(AuthContext);

  // --- LẤY DỮ LIỆU ---
  const centerId = state?.centerId || localStorage.getItem("centerId");
  const initialDate = state?.date || localStorage.getItem("selectedDate");
  const totalPrice = state?.total || Number(localStorage.getItem("totalAmount")) || 0;
  const bookingId = state?.bookingId || localStorage.getItem("bookingId");
  const bookingCode = state?.bookingCode || bookingId || "BK-UNKNOWN";
  
  // State
  const [timeLeft, setTimeLeft] = useState(null); 
  const [slotGroups, setSlotGroups] = useState([]);
  
  // State Payment
  const [paymentData, setPaymentData] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState(""); 
  const [isLoadingPayment, setIsLoadingPayment] = useState(true); // Mặc định true để check cache
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  
  const pollingIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    const storedGroups = localStorage.getItem("slotGroups");
    if (storedGroups) setSlotGroups(JSON.parse(storedGroups));
  }, []);

  // --- 1. LOGIC KHỞI TẠO (QUAN TRỌNG: CHECK CACHE TRƯỚC) ---
  useEffect(() => {
    const initPayment = async () => {
      if (!bookingId || totalPrice <= 0) return;

      const cacheKey = `payos_tx_${bookingId}`;
      const cachedDataStr = localStorage.getItem(cacheKey);
      
      let data = null;
      let shouldUseCache = false;

      // Bước 1: Kiểm tra xem có dữ liệu cũ còn hạn không
      if (cachedDataStr) {
        const cachedData = JSON.parse(cachedDataStr);
        const now = Math.floor(Date.now() / 1000);
        // Nếu link chưa hết hạn (dựa vào expiredAt trả về từ API)
        if (cachedData.expiredAt && cachedData.expiredAt > now) {
           data = cachedData;
           shouldUseCache = true;
           console.log("Resuming payment from cache...");
        } else {
           localStorage.removeItem(cacheKey); // Xóa cache hết hạn
        }
      }

      // Bước 2: Nếu không có cache hoặc hết hạn, gọi API mới
      if (!shouldUseCache) {
        try {
          setIsLoadingPayment(true);
          data = await createPayOSPayment({
            bookingId: bookingId,
            amount: totalPrice,
            description: `Thanh toan ${bookingCode.slice(-6)}`, 
            returnUrl: window.location.origin + "/payment-success",
            cancelUrl: window.location.origin + "/payment-cancel"
          });
          
          // Lưu vào LocalStorage để F5 không bị mất
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (error) {
          console.error("Lỗi tạo PayOS link:", error);
          setIsLoadingPayment(false);
          return;
        }
      }

      // Bước 3: Set dữ liệu vào State
      if (data) {
        setPaymentData(data);

        // -- TÍNH TOÁN THỜI GIAN --
        const now = Math.floor(Date.now() / 1000);
        const expireTime = data.expiredAt || (data.createdAt + 300); // Ưu tiên expiredAt từ server
        const remaining = expireTime - now;
        setTimeLeft(remaining > 0 ? remaining : 0);

        // -- TẠO ẢNH QR --
        if (data.bin && data.accountNumber) {
            const qrLink = `https://img.vietqr.io/image/${data.bin}-${data.accountNumber}-compact2.png?amount=${data.amount}&addInfo=${encodeURIComponent(data.description)}&accountName=${encodeURIComponent(data.accountName || "Dat San")}`;
            setQrImageUrl(qrLink);
        }
      }
      
      setIsLoadingPayment(false);
    };

    initPayment();
  }, [bookingId, totalPrice, bookingCode]);

  // --- 2. POLLING & TIMER (GIỮ NGUYÊN) ---
  useEffect(() => {
    if (!paymentData?.orderCode) return;

    const pollStatus = async () => {
      try {
        const res = await getBookingStatusFromBookingId(bookingId);
        if (res === "confirmed") {
           clearInterval(pollingIntervalRef.current);
           handlePaymentSuccess();
        }
      } catch (error) {}
    };

    pollingIntervalRef.current = setInterval(pollStatus, 2000); 
    return () => clearInterval(pollingIntervalRef.current);
  }, [paymentData]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [timeLeft]);

  // Xử lý thành công
  const handlePaymentSuccess = async () => {
    // Xóa cache khi thành công
    if (bookingId) localStorage.removeItem(`payos_tx_${bookingId}`);
    
    localStorage.removeItem("paymentStartTime");
    localStorage.removeItem("bookingExpiresAt");
    
    try {
      const updatedUserData = await fetchUserInfo();
      setUser(updatedUserData.user);
    } catch (e) {}
    
    setIsSuccessModalOpen(true);
  };
  
  // ... (Phần Helpers formatTime, handleCopy giữ nguyên) ...
  const formatTime = (t) => {
    if (t === null) return "--:--"; 
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 1500);
  };

  const handleSuccessModalAction = (action) => {
    setIsSuccessModalOpen(false);
    if (action === "yes") {
      localStorage.setItem("orderCenterId", centerId);
      localStorage.setItem("orderDate", initialDate);
      navigate("/service");
    } else {
      navigate("/");
    }
  };

  if (timeLeft === 0) return <SessionExpired />;

  return (
    <div className="min-h-screen w-full flex flex-col bg-green-800 text-white">
      <BookingHeader title="Thanh toán PayOS" onBack={() => navigate("/")} />

      <div className="flex flex-1 p-4 lg:p-6 gap-6 max-w-7xl mx-auto w-full flex-col md:flex-row">
        {/* CỘT TRÁI: QR */}
        <div className="flex-1 flex flex-col gap-5">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden text-gray-800 border-2 border-green-500">
            <div className="bg-gradient-to-r from-green-600 to-green-500 px-6 py-4 border-b border-green-400 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <QrCode size={24} /> Quét mã để thanh toán
              </h2>
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-white text-xs font-medium backdrop-blur-sm">
                 <Loader size={14} className="animate-spin" /> Đang chờ hệ thống xác nhận...
              </div>
            </div>

            <div className="p-8 flex flex-col items-center justify-center min-h-[450px] bg-gray-50">
                {isLoadingPayment || timeLeft === null ? (
                    <div className="flex flex-col items-center text-gray-500 animate-pulse">
                        <Loader className="animate-spin mb-4 text-green-600" size={48} />
                        <p className="text-lg font-medium">Đang tải thông tin...</p>
                    </div>
                ) : paymentData ? (
                    <>
                        <div className="relative group mb-6 transition-transform hover:scale-105 duration-300">
                            <div className="rounded-lg overflow-hidden shadow-xl bg-white p-2 border border-gray-200">
                                {qrImageUrl ? (
                                    <img src={qrImageUrl} alt="Mã QR Chuyển Khoản" className="w-full max-w-[350px] object-contain block mx-auto" />
                                ) : (
                                    <div className="w-[300px] h-[300px] flex items-center justify-center bg-gray-100 text-gray-400">Lỗi hiển thị QR</div>
                                )}
                            </div>
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-gray-600 text-sm font-medium">Sử dụng App Ngân hàng để quét.</p>
                             <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-100 text-sm inline-block text-left">
                                <p className="mb-1"><span className="text-gray-500">Số tiền:</span> <b className="text-red-600">{paymentData.amount?.toLocaleString()} đ</b></p>
                                <p className="flex items-center gap-2">
                                  <span className="text-gray-500">Nội dung:</span> 
                                  <b className="bg-yellow-200 px-1 rounded text-gray-800">{paymentData.description}</b>
                                  <Copy size={12} className="cursor-pointer text-blue-500" onClick={() => handleCopy(paymentData.description)}/>
                                </p>
                             </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-red-500">
                        <AlertTriangle size={48} className="mx-auto mb-3" />
                        <p>Không thể tạo đơn hàng.</p>
                    </div>
                )}
            </div>
          </div>
          
          {/* TIMER */}
          <div className="bg-green-900/80 backdrop-blur rounded-xl p-4 flex flex-row items-center justify-between shadow-lg border border-green-600">
            <div className="flex flex-col">
                <div className="flex items-center gap-2 text-green-300 text-sm font-bold uppercase tracking-wider mb-1">
                  <Clock size={16} /> Thời gian giữ chỗ
                </div>
                <p className="text-xs text-green-200">Đơn hàng sẽ tự hủy nếu hết giờ</p>
            </div>
            <div className={`text-4xl font-mono font-bold tabular-nums ${timeLeft !== null && timeLeft < 60 ? "text-red-400 animate-pulse" : "text-yellow-400"}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div className="w-full md:w-96">
          <div className="bg-green-900 rounded-xl shadow-xl overflow-hidden sticky top-6 border border-green-700">
             <div className="bg-green-800 px-5 py-4 border-b border-green-600">
              <h2 className="font-bold text-white text-lg flex items-center gap-2">Chi tiết đơn hàng</h2>
            </div>
            <div className="p-6 flex flex-col gap-5 text-sm">
                <div className="flex justify-between border-b border-green-800 pb-3">
                    <span className="text-green-300">Khách hàng</span>
                    <span className="font-semibold text-white text-right">{user?.name}</span>
                </div>
                 <div className="flex justify-between border-b border-green-800 pb-3">
                    <span className="text-green-300">SĐT</span>
                    <span className="font-semibold text-white">{user?.phone_number || "---"}</span>
                </div>
                <div className="flex justify-between border-b border-green-800 pb-3">
                    <span className="text-green-300">Mã đơn</span>
                    <span className="font-mono font-bold text-yellow-400 bg-yellow-400/10 px-2 rounded">{bookingCode}</span>
                </div>
                {/* Slot Details */}
                <div className="py-2">
                    <p className="text-green-300 mb-2">Lịch đặt sân:</p>
                    {slotGroups.map((group, idx) => (
                        <div key={idx} className="bg-green-800 p-2 rounded mb-2 border border-green-700">
                            <div className="font-bold text-white">{group.courtName}</div>
                            <div className="text-xs text-green-200">{group.timeStr}</div>
                        </div>
                    ))}
                </div>
                <div className="border-t border-dashed border-green-500 pt-5 mt-2">
                    <div className="flex justify-between items-end">
                        <span className="text-green-200 text-base">Tổng cộng</span>
                        <span className="text-3xl font-bold text-yellow-400 tracking-tight">{totalPrice.toLocaleString('vi-VN')} đ</span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL & TOAST GIỮ NGUYÊN */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 animate-in fade-in duration-300 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center transform transition-all scale-100 border-t-8 border-green-500">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <i className="fas fa-check text-5xl text-green-600"></i>
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-2">Thanh toán thành công!</h3>
            <p className="text-gray-500 mb-8 px-4">Hệ thống PayOS đã xác nhận giao dịch.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleSuccessModalAction("no")} className="px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Trang chủ</button>
              <button onClick={() => handleSuccessModalAction("yes")} className="px-4 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200">Đặt dịch vụ</button>
            </div>
          </div>
        </div>
      )}
      {showCopied && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-2xl z-50 text-sm font-medium animate-bounce">Đã sao chép!</div>}
    </div>
  );
};

export default PaymentPage;