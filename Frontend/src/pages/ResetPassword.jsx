import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resetPasswordApi } from "../apis/users";

const ResetPasswordPage = () => {
  const { token, userId } = useParams(); // Đổi thứ tự: token trước, userId sau
  console.log(userId, token)
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);

  const validatePassword = (password) => {
    const errors = {};
    if (password.length < 8) {
      errors.newPassword = "Mật khẩu phải có ít nhất 8 ký tự.";
    }
    if (!/[A-Z]/.test(password)) {
      errors.newPassword = "Mật khẩu phải chứa ít nhất một chữ hoa.";
    }
    if (!/[a-z]/.test(password)) {
      errors.newPassword = "Mật khẩu phải chứa ít nhất một chữ thường.";
    }
    if (!/[0-9]/.test(password)) {
      errors.newPassword = "Mật khẩu phải chứa ít nhất một số.";
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.newPassword = "Mật khẩu phải chứa ít nhất một ký tự đặc biệt.";
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setErrors({});

    // Kiểm tra mật khẩu
    const passwordErrors = validatePassword(newPassword);
    if (Object.keys(passwordErrors).length > 0) {
      setErrors(passwordErrors);
      return;
    }

    // Kiểm tra xác nhận mật khẩu
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Mật khẩu xác nhận không khớp." });
      return;
    }

    try {
      const response = await resetPasswordApi(token, userId, newPassword);
      console.log(token, userId, newPassword) // Đổi thứ tự: token, userId
      setMessage(response.message);
      setShowModal(true);
      setNewPassword("");
      setConfirmPassword("");
      // Tự động chuyển hướng sau 3 giây
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (error) {
      const backendMessage = error.response?.data?.message || error.message || "Có lỗi xảy ra";
      setError(backendMessage);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Đặt Lại Mật Khẩu
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Mật khẩu mới
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.newPassword ? "border-red-500" : "border-gray-300"
              } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200`}
              placeholder="Nhập mật khẩu mới"
              required
            />
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`mt-1 block w-full px-3 py-2 border ${
                errors.confirmPassword ? "border-red-500" : "border-gray-300"
              } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200`}
              placeholder="Nhập lại mật khẩu mới"
              required
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {errors.confirmPassword}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
          >
            Đặt lại mật khẩu
          </button>
        </form>
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-center">
            {error}
          </div>
        )}
        <p className="mt-4 text-center text-sm text-gray-600">
          Quay lại{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Đăng nhập
          </a>
        </p>
      </div>

      {/* Modal thông báo thành công */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full text-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              {message}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Bạn sẽ được chuyển về trang chủ trong 3 giây...
            </p>
            <button
              onClick={handleCloseModal}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResetPasswordPage;