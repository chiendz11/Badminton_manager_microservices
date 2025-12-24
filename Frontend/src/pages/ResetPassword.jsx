import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resetPasswordApi } from "../apiV2/auth_service/auth.api.js";

// Icons (Dùng SVG trực tiếp để không phụ thuộc thư viện ngoài)
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-500 mr-2">
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-400 mr-2">
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
  </svg>
);

const ResetPasswordPage = () => {
  const { token, userId } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Real-time validation states
  const [validations, setValidations] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    setValidations({
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    });
  }, [newPassword]);

  const isValidPassword = Object.values(validations).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!isValidPassword) {
      setError("Mật khẩu chưa đủ mạnh. Vui lòng kiểm tra lại các yêu cầu.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await resetPasswordApi(token, userId, newPassword);
      setMessage(response.message || "Đặt lại mật khẩu thành công!");
      setShowModal(true);
      setNewPassword("");
      setConfirmPassword("");
      
      setTimeout(() => {
        navigate("/"); // Chuyển về trang login thay vì trang chủ
      }, 3000);
    } catch (error) {
      const backendMessage = error.response?.data?.message || error.message || "Có lỗi xảy ra, vui lòng thử lại.";
      setError(backendMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    navigate("/");
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: "url('/images/hero-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Overlay tối để làm nổi bật form */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-0"></div>

      <div className="relative z-10 w-full max-w-lg p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          
          {/* Header với icon cầu lông */}
          <div className="bg-blue-600 p-6 text-center relative">
            <div className="absolute top-4 left-4 w-12 h-12 animate-bounce opacity-20">
               <img src="/images/shuttleCock.png" alt="decoration" />
            </div>
            <div className="absolute bottom-4 right-4 w-16 h-16 opacity-20 rotate-45">
               <img src="/images/badminton.png" alt="decoration" />
            </div>
            
            <h2 className="text-3xl font-extrabold text-white tracking-wide uppercase">
              Đặt Lại Mật Khẩu
            </h2>
            <p className="text-blue-100 mt-2 text-sm">
              Sẵn sàng trở lại sân đấu với mật khẩu mới
            </p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 ml-1">Mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Nhập mật khẩu mới..."
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Password Strength Checklist */}
              <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 border border-gray-100">
                <p className="font-semibold text-gray-500 mb-2">Độ mạnh mật khẩu:</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <div className={`flex items-center ${validations.length ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                        {validations.length ? <CheckIcon/> : <XIcon/>} Tối thiểu 8 ký tự
                    </div>
                    <div className={`flex items-center ${validations.uppercase ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                        {validations.uppercase ? <CheckIcon/> : <XIcon/>} Chữ hoa (A-Z)
                    </div>
                    <div className={`flex items-center ${validations.lowercase ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                        {validations.lowercase ? <CheckIcon/> : <XIcon/>} Chữ thường (a-z)
                    </div>
                    <div className={`flex items-center ${validations.number ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                        {validations.number ? <CheckIcon/> : <XIcon/>} Số (0-9)
                    </div>
                    <div className={`flex items-center ${validations.special ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                        {validations.special ? <CheckIcon/> : <XIcon/>} Ký tự đặc biệt (!@#)
                    </div>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700 ml-1">Xác nhận mật khẩu</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-4 pr-12 py-3 border rounded-lg outline-none transition-all ${
                        confirmPassword && newPassword !== confirmPassword 
                        ? "border-red-500 focus:ring-red-200" 
                        : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    }`}
                    placeholder="Nhập lại mật khẩu..."
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-red-500 text-xs mt-1 ml-1">Mật khẩu không khớp.</p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !isValidPassword || newPassword !== confirmPassword}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isLoading ? (
                    <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang xử lý...
                    </span>
                ) : (
                    "Xác nhận thay đổi"
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <a href="/" className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Quay lại trang đăng nhập
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center relative z-10 animate-fade-in-up">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
               <img src="/images/shuttleCock.png" alt="Success" className="w-10 h-10 object-contain animate-bounce" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Thành công!</h3>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-xs text-gray-400 mb-6 italic">Đang chuyển hướng về trang đăng nhập...</p>
            
            <button
              onClick={handleCloseModal}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResetPasswordPage;