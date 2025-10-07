import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { clearAllPendingBookings, confirmBooking } from "../apis/booking";
import { Copy, Clock, AlertTriangle, Upload, User, Phone, Hash, Calendar, DollarSign } from "lucide-react";
import SessionExpired from "../components/SessionExpired";
import BookingHeader from "../components/BookingHeader";
import { AuthContext } from "../contexts/AuthContext";
import { fetchUserInfo } from "../apis/users";
import '../styles/payments.css';

const PaymentPage = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user, setUser } = useContext(AuthContext);

  // Lấy thông tin user
  const userId = user?._id || "000000000000000000000001";
  const centerId = state?.centerId || localStorage.getItem("centerId") || "67ca6e3cfc964efa218ab7d7";
  const initialDate = state?.date || localStorage.getItem("selectedDate") || new Date().toISOString().split("T")[0];
  const totalPrice = state?.total || Number(localStorage.getItem("totalAmount")) || 0;
  const bookingCode = state?.bookingCode || localStorage.getItem("bookingId") || "BK123456";
  const centerName = localStorage.getItem("centerName") || "Tên Trung Tâm Mặc Định";

  // State
  const [selectedDate] = useState(initialDate);
  const [timeLeft, setTimeLeft] = useState(300);
  const [showCopied, setShowCopied] = useState(false);
  const [paymentImageBase64, setPaymentImageBase64] = useState("");
  const [note, setNote] = useState("");
  const [slotGroups, setSlotGroups] = useState([]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const paymentFileInputRef = useRef(null);

  // Khi component mount, lấy slotGroups từ localStorage
  useEffect(() => {
    const storedGroups = localStorage.getItem("slotGroups");
    if (storedGroups) {
      setSlotGroups(JSON.parse(storedGroups));
    }
  }, []);

  // Clear pending bookings khi load
  useEffect(() => {
    const clearAll = async () => {
      try {
        await clearAllPendingBookings({ userId, centerId });
      } catch (error) {
        console.error("Lỗi xóa pending bookings khi mount:", error);
      }
    };
    clearAll();
  }, [userId, centerId]);

  // Đồng hồ đếm ngược
  useEffect(() => {
    const getExpiresAt = () => {
      const expiresAtStr = localStorage.getItem("bookingExpiresAt");
      if (expiresAtStr) {
        return new Date(expiresAtStr).getTime();
      }
      return null;
    };

    const startCountdown = () => {
      const expiresAt = getExpiresAt();
      let animationFrameId;
      if (expiresAt) {
        const updateCountdown = () => {
          const now = Date.now();
          const remaining = Math.floor((expiresAt - now) / 1000);
          setTimeLeft(remaining > 0 ? remaining : 0);
          if (remaining > 0) {
            animationFrameId = requestAnimationFrame(updateCountdown);
          }
        };
        updateCountdown();
        return () => cancelAnimationFrame(animationFrameId);
      } else {
        const startTime = parseInt(localStorage.getItem("paymentStartTime"), 10) || Date.now();
        const updateCountdown = () => {
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          const remaining = 300 - elapsed;
          setTimeLeft(remaining > 0 ? remaining : 0);
        };
        updateCountdown();
        const interval = setInterval(updateCountdown, 250);
        return () => clearInterval(interval);
      }
    };

    const cleanup = startCountdown();
    return cleanup;
  }, []);

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText("0982451906");
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 1500);
  };

  const handlePaymentImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Define allowed file extensions
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
      const fileExtension = file.name.split('.').pop().toLowerCase();

      // Check if the file extension is allowed
      if (!allowedExtensions.includes(fileExtension)) {
        alert('Định dạng ảnh không hợp lệ! Vui lòng chọn file có định dạng JPG, PNG hoặc GIF.');
        // Reset the file input to allow selecting another file
        if (paymentFileInputRef.current) {
          paymentFileInputRef.current.value = '';
        }
        setPaymentImageBase64(''); // Clear any previous image
        return;
      }

      // Process the valid file
      const reader = new FileReader();
      reader.onload = () => {
        setPaymentImageBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Xử lý back (popstate)
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      clearAllPendingBookings({ userId, centerId })
        .then(() => {
          localStorage.removeItem("paymentStartTime");
          navigate("/");
        })
        .catch((err) => {
          console.error("Lỗi khi xóa pending bookings khi back:", err);
          navigate("/");
        });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate, userId, centerId]);

  // Clear pending bookings khi unmount
  useEffect(() => {
    return () => {
      clearAllPendingBookings({ userId, centerId })
        .then(() => {
          localStorage.removeItem("paymentStartTime");
        })
        .catch((err) => console.error("Lỗi khi xóa pending bookings khi unmount:", err));
    };
  }, [userId, centerId]);

  if (timeLeft === 0) {
    return <SessionExpired />;
  }

  // Hàm mở modal xác nhận khi nhấn nút "Confirm Booking"
  const handleConfirmOrder = () => {
    setIsConfirmModalOpen(true);
  };

  // Xử lý hành động từ modal xác nhận
  const handleModalAction = async (action) => {
    if (action === "confirm") {
      try {
        const { success } = await confirmBooking({
          userId,
          centerId,
          date: initialDate,
          totalPrice,
          paymentImage: paymentImageBase64,
          note,
        });

        if (!success) {
          alert("Xác nhận booking thất bại.");
          return;
        }

        // Hiển thị modal thành công
        setIsSuccessModalOpen(true);

        // Xóa thời gian đếm ngược trong localStorage
        localStorage.removeItem("paymentStartTime");
        localStorage.removeItem("bookingExpiresAt");

        // Cập nhật dữ liệu user sau khi booking thành công
        const updatedUserData = await fetchUserInfo();
        setUser(updatedUserData.user);
      } catch (error) {
        alert("Lỗi khi xác nhận booking: " + error.message);
      }
    }
    setIsConfirmModalOpen(false);
  };

  // Xử lý khi người dùng trả lời câu hỏi trong modal thành công
  const handleSuccessModalAction = (action) => {
    setIsSuccessModalOpen(false);
    if (action === "yes") {
      // Lưu centerId và date vào localStorage
      localStorage.setItem("orderCenterId", centerId);
      localStorage.setItem("orderDate", initialDate);
      // Điều hướng đến trang đặt đồ
      navigate("/service");
    } else {
      // Nếu không muốn đặt đồ, điều hướng về trang chính
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-green-800 text-white">
      {/* Header */}
      <BookingHeader title="Thanh toán" onBack={() => navigate("/")} />

      {/* Main content */}
      <div className="flex flex-1 p-4 lg:p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* Left column: Payment information */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Thẻ thông tin ngân hàng */}
          <div className="bg-green-700 rounded-lg shadow-lg overflow-hidden">
            <div className="bg-green-600 px-4 py-3 border-b border-green-500">
              <h2 className="text-lg font-bold flex items-center gap-2 text-yellow-300">
                <DollarSign size={20} /> Thông tin ngân hàng
              </h2>
            </div>
            <div className="p-5 flex gap-6 items-center">
              <div className="flex-1">
                <div className="mb-4">
                  <p className="text-gray-300 text-sm mb-1">Tên tài khoản</p>
                  <p className="font-semibold text-white">BUI ANH CHIEN</p>
                </div>
                <div className="mb-4">
                  <p className="text-gray-300 text-sm mb-1">Số tài khoản</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white bg-green-900 py-1 px-3 rounded">
                      0982451906
                    </p>
                    <div className="relative">
                      <button
                        onClick={handleCopyAccount}
                        className="bg-yellow-500 hover:bg-yellow-600 text-green-900 px-3 py-1 rounded-md flex items-center gap-1 transition-colors font-medium text-sm"
                      >
                        <Copy size={14} /> Copy
                      </button>
                      {showCopied && (
                        <div className="absolute top-full left-0 mt-1 text-green-900 text-sm bg-white px-2 py-1 rounded shadow">
                          Copied!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-gray-300 text-sm mb-1">Tên ngân hàng</p>
                  <p className="font-semibold text-white">MBBank</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="bg-transparent p-2 rounded-lg cursor-pointer" onClick={() => setShowQrModal(true)}>
                  <img
                    src="/images/QR.jpg"
                    alt="QR Code for payment"
                    className="w-32 h-32 object-contain qr-code-image"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment alert */}
          <div className="bg-yellow-500 bg-opacity-20 border-l-4 border-yellow-500 text-white rounded-md p-4 flex items-start gap-3">
            <AlertTriangle size={24} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-300 mb-1">Yêu cầu thanh toán</p>
              <p className="leading-snug">
                Vui lòng chuyển khoản{" "}
                <span className="text-yellow-300 font-bold text-lg">
                  {totalPrice.toLocaleString("vi-VN")} đ
                </span>{" "}
                và tải ảnh xác nhận thanh toán dưới đây để hoàn tất đặt sân.
              </p>
            </div>
          </div>

          {/* Note */}
          <div className="bg-green-700 bg-opacity-50 p-4 rounded-md border border-green-600">
            <p className="text-sm text-yellow-200 italic">
              Sau khi chuyển khoản, vui lòng kiểm tra trạng thái đặt sân của bạn trong tab "Thông tin cá nhân" cho đến khi chủ sân xác nhận đặt sân của bạn.
            </p>
          </div>

          {/* Time countdown */}
          <div className="flex flex-col items-center justify-center bg-green-900 rounded-lg p-4 mt-2">
            <div className="flex items-center gap-2 text-gray-300 mb-2">
              <Clock size={18} />
              <p>Thời gian đặt sân còn lại:</p>
            </div>
            <h3 className={`text-3xl font-bold ${timeLeft < 60 ? "text-red-400" : "text-yellow-300"}`}>
              {formatTime(timeLeft)}
            </h3>
          </div>

          {/* Image upload section */}
          <div className="mt-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Upload size={18} /> Tải ảnh xác nhận thanh toán
            </h3>
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm text-yellow-300 mb-2">Ảnh xác nhận thanh toán *</p>
                <label
                  className={`border-2 ${
                    paymentImageBase64 ? "border-green-500" : "border-yellow-500 border-dashed"
                  } rounded-lg h-48 flex flex-col items-center justify-center text-center p-2 cursor-pointer transition-colors hover:bg-green-700`}
                >
                  {paymentImageBase64 ? (
                    <img
                      src={paymentImageBase64}
                      alt="Payment confirmation"
                      className="h-full object-contain"
                    />
                  ) : (
                    <>
                      <Upload size={24} className="mb-2 text-yellow-300" />
                      <p className="text-sm">Click để tải ảnh</p>
                      <p className="text-xs text-gray-300 mt-1">(Chỉ chấp nhận jpg, png, gif)</p>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handlePaymentImageUpload}
                    accept="image/png, image/jpeg, image/gif"
                    ref={paymentFileInputRef}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Ghi chú cho chủ sân */}
          <div className="mt-4">
            <label className="block text-white font-semibold mb-2">
              Ghi chú cho chủ sân (nếu cần):
            </label>
            <textarea
              className="w-full rounded-md p-2 text-black focus:outline-none focus:ring-2 focus:ring-yellow-500"
              rows={3}
              placeholder="Nhập ghi chú..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Confirm button */}
          <div className="mt-auto pt-6">
            <button
              onClick={handleConfirmOrder}
              className="bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-green-900 font-bold w-full py-4 rounded-md text-lg transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <span>THANH TOÁN</span>
              <span className="animate-ping text-2xl">→</span>
            </button>
          </div>
        </div>

        {/* Right column: Booking summary */}
        <div className="w-80 hidden md:block">
          <div className="bg-green-900 rounded-lg shadow-lg overflow-hidden sticky top-20">
            <div className="bg-green-700 px-4 py-3 border-b border-green-600">
              <h2 className="font-bold flex items-center gap-2">Tóm tắt đặt sân</h2>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {/* Hiển thị tên khách hàng */}
              <div className="flex items-center gap-3">
                <User size={18} className="text-green-400" />
                <div>
                  <p className="text-gray-300 text-xs">Tên khách hàng</p>
                  <p className="font-medium">{user?.name || "Loading..."}</p>
                </div>
              </div>
              {/* Hiển thị số điện thoại */}
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-green-400" />
                <div>
                  <p className="text-gray-300 text-xs">Số điện thoại</p>
                  <p className="font-medium">{user?.phone_number || "Loading..."}</p>
                </div>
              </div>
              {/* Mã booking */}
              <div className="flex items-center gap-3">
                <Hash size={18} className="text-green-400" />
                <div>
                  <p className="text-gray-300 text-xs">Mã booking</p>
                  <p className="font-medium">{bookingCode}</p>
                </div>
              </div>
              {/* Hiển thị tên trung tâm */}
              <div className="flex items-center gap-3">
                <i className="fas fa-building text-green-400"></i>
                <div>
                  <p className="text-gray-300 text-xs">Tên trung tâm</p>
                  <p className="font-medium">{centerName}</p>
                </div>
              </div>
              {/* Booking details */}
              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-green-400" />
                <div>
                  <p className="text-gray-300 text-xs">Chi tiết đặt sân</p>
                  {slotGroups.length > 0 ? (
                    <>
                      <p className="font-medium">Sân và Thời Gian:</p>
                      {slotGroups.map((group, idx) => (
                        <p key={idx} className="font-medium">
                          ~ {group.courtName} - {group.timeStr} ~
                        </p>
                      ))}
                    </>
                  ) : (
                    <p className="font-medium">{selectedDate}</p>
                  )}
                </div>
              </div>
              <div className="h-px bg-green-700 my-2"></div>
              {/* Hiển thị tổng tiền */}
              <div className="flex items-center gap-3">
                <DollarSign size={18} className="text-yellow-400" />
                <div>
                  <p className="text-gray-300 text-xs">Tổng tiền</p>
                  <p className="font-bold text-yellow-300 text-lg">
                    {totalPrice.toLocaleString("vi-VN")} đ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input file ẩn cho payment image */}
      <input
        type="file"
        accept="image/png, image/jpeg, image/gif"
        ref={paymentFileInputRef}
        style={{ display: "none" }}
        onChange={handlePaymentImageUpload}
      />

      {/* Modal hiển thị QR Code */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-50">
          <div className="relative bg-white p-4 rounded-lg">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-2 right-2 text-gray-700 hover:text-gray-900"
            >
              ✕
            </button>
            <img
              src="/images/Full_QR.jpg"
              alt="QR Code for payment"
              className="max-w-full max-h-[80vh]"
            />
          </div>
        </div>
      )}

      {/* Modal xác nhận thanh toán */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full transform transition-all duration-300 scale-100 hover:scale-105">
            <h3 className="text-2xl font-bold text-green-900 mb-4 flex items-center gap-2">
              <i className="fas fa-check-circle text-green-500"></i> Xác nhận thanh toán
            </h3>
            <p className="text-gray-700 mb-6 text-lg">
              Bạn có chắc chắn về ảnh bill đã tải lên không? Vui lòng kiểm tra kỹ trước khi tiếp tục.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => handleModalAction("cancel")}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => handleModalAction("confirm")}
                className="px-6 py-2 bg-green-900 text-white rounded-md hover:bg-green-800 transition-colors flex items-center gap-2"
              >
                <i className="fas fa-check"></i> Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal thông báo thành công với câu hỏi đặt đồ online */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full transform transition-all duration-300 scale-100 hover:scale-105">
            <h3 className="text-2xl font-bold text-green-900 mb-4 flex items-center gap-2">
              <i className="fas fa-check-circle text-green-500"></i> Thanh toán thành công
            </h3>
            <p className="text-gray-700 mb-4 text-lg">
              Vui lòng vào phần lịch sử đặt sân để kiểm tra xem liệu admin đã duyệt đơn cho bạn chưa (admin thường mất một vài giây để duyệt).
            </p>
            <p className="text-gray-700 mb-6 text-lg">
              Bạn có muốn đặt đồ online (nước uống, vợt, cầu, v.v.) cho ngày chơi không?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => handleSuccessModalAction("no")}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Không
              </button>
              <button
                onClick={() => handleSuccessModalAction("yes")}
                className="px-6 py-2 bg-green-900 text-white rounded-md hover:bg-green-800 transition-colors"
              >
                Có
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;