import React, { useState, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { AuthContext } from "../contexts/AuthContext";

// Import APIs
import { updateMyPassword } from "../apiV2/auth_service/rest/user.api.js";
import { updateAvatar } from "../apiV2/user_service/rest/user.api.js";

import { FaUserShield, FaKey, FaCamera, FaSave, FaTimes } from "react-icons/fa";
import { GiShuttlecock } from "react-icons/gi"; 
import { MdEmail, MdPhone } from "react-icons/md";

const Account = () => {
  // Lấy admin và setAdmin từ AuthContext
  const { admin, setAdmin } = useContext(AuthContext);
  
  const DEFAULT_AVATAR_URL = "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png";

  // Hàm helper lấy đường dẫn ảnh
  const getAvatarImagePath = (path) => {
    if (path && path.trim() !== "") {
        return path; 
    }
    return DEFAULT_AVATAR_URL;
  };

  // --- STATE QUẢN LÝ AVATAR ---
  const [avatarFile, setAvatarFile] = useState(null);
  
  // Khởi tạo preview từ admin.avatar hiện tại
  const [preview, setPreview] = useState(getAvatarImagePath(admin?.avatar_url));
  const [loadingAvatar, setLoadingAvatar] = useState(false);

  // --- STATE QUẢN LÝ MẬT KHẨU ---
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loadingPassword, setLoadingPassword] = useState(false);

  // 💡 QUAN TRỌNG: Đồng bộ Preview khi admin context thay đổi (VD: sau khi F5 xong và AuthContext fetch xong data)
  useEffect(() => {
    // Chỉ cập nhật preview từ context nếu người dùng KHÔNG đang chọn file mới
    if (!avatarFile) {
        setPreview(getAvatarImagePath(admin?.avatar_url));
    }
  }, [admin, avatarFile]); 

  // --- HANDLERS: AVATAR ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Vui lòng chọn file ảnh hợp lệ!");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Kích thước ảnh không được vượt quá 5MB!");
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateAvatar = async () => {
    if (!avatarFile) return;
    setLoadingAvatar(true);
    try {
      const result = await updateAvatar(avatarFile);
      toast.success("Cập nhật ảnh đại diện thành công! 🏸");
      
      // Lấy URL mới từ response
      let newAvatarUrl = result.data?.avatar_url || result.avatar_url;
      
      // Nếu API trả về URL, ta cập nhật ngay vào Context
      if (newAvatarUrl) {
          // Mẹo: Thêm timestamp để tránh browser cache nếu URL không đổi
          // newAvatarUrl = `${newAvatarUrl}?t=${new Date().getTime()}`; 

          setAdmin(prev => ({
              ...prev,
              avatar: newAvatarUrl
          }));
          
          // Cập nhật lại preview ngay lập tức để UI mượt mà
          setPreview(newAvatarUrl);
      }
      
      setAvatarFile(null);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật ảnh đại diện");
    } finally {
      setLoadingAvatar(false);
    }
  };

  const cancelAvatarChange = () => {
    setAvatarFile(null);
    setPreview(getAvatarImagePath(admin?.avatar_url));
  };

  // --- HANDLERS: PASSWORD ---
  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      toast.warning("Vui lòng điền đầy đủ mật khẩu cũ và mới.");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.warning("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    setLoadingPassword(true);
    try {
      await updateMyPassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });

      toast.success("Đổi mật khẩu thành công! Vui lòng đăng nhập lại nếu cần.");
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu cũ.");
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-inter">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-green-800 flex items-center justify-center gap-3">
            <FaUserShield className="text-4xl" />
            Quản Lý Tài Khoản
          </h1>
          <p className="mt-2 text-gray-600">Cập nhật thông tin cá nhân và bảo mật tài khoản của bạn.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* CỘT TRÁI: THÔNG TIN & AVATAR */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
              <div className="h-24 bg-gradient-to-r from-green-600 to-green-800"></div>
              
              <div className="px-6 pb-6 text-center relative">
                <div className="relative -mt-12 w-32 h-32 mx-auto">
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-200 group">
                    {/* Dùng key để force re-render ảnh khi URL thay đổi nếu cần */}
                    <img
                      key={preview} 
                      src={preview}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                    <label htmlFor="avatar-upload" className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <FaCamera className="text-white text-2xl" />
                    </label>
                  </div>
                  <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-50 border-2 border-white rounded-full" title="Online"></span>
                </div>

                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />

                <h2 className="mt-4 text-xl font-bold text-gray-800">{admin?.name || "Admin User"}</h2>
                <p className="text-sm text-green-600 font-semibold mb-1 flex items-center justify-center gap-1">
                  <GiShuttlecock className="text-lg" /> {admin?.role || "Quản trị viên"}
                </p>
                <p className="text-xs text-gray-400">ID: {admin?._id || "unknown"}</p>

                <div className="mt-6 space-y-3 text-left">
                  <div className="flex items-center text-gray-600 text-sm p-3 bg-gray-50 rounded-lg">
                    <MdEmail className="text-green-600 mr-3 text-lg" />
                    <span className="truncate">{admin?.email || "email@example.com"}</span>
                  </div>
                  <div className="flex items-center text-gray-600 text-sm p-3 bg-gray-50 rounded-lg">
                    <MdPhone className="text-green-600 mr-3 text-lg" />
                    <span>{admin?.phone_number || "Chưa cập nhật SĐT"}</span>
                  </div>
                </div>

                {avatarFile && (
                  <div className="mt-4 flex gap-2 animate-fade-in-up">
                    <button
                      onClick={handleUpdateAvatar}
                      disabled={loadingAvatar}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      {loadingAvatar ? "Đang lưu..." : <><FaSave /> Lưu ảnh</>}
                    </button>
                    <button
                      onClick={cancelAvatarChange}
                      className="flex-none bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg transition"
                      title="Hủy bỏ"
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: ĐỔI MẬT KHẨU */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 h-full">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                <FaKey className="text-orange-500" />
                Đổi Mật Khẩu
              </h3>

              <form onSubmit={handleUpdatePassword} className="space-y-6">
                
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <input
                      type="password"
                      name="oldPassword"
                      value={passwordData.oldPassword}
                      onChange={handlePasswordChange}
                      placeholder="••••••••"
                      className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Ít nhất 6 ký tự"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Nhập lại mật khẩu mới"
                      className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all ${
                        passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                          ? "border-red-300 focus:ring-red-200"
                          : "border-gray-200"
                      }`}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 flex items-start gap-2">
                  <span className="mt-1">ℹ️</span>
                  <p>Để bảo mật tài khoản tốt hơn, hãy sử dụng mật khẩu mạnh bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={loadingPassword}
                    className={`
                      px-8 py-3 rounded-lg text-white font-semibold shadow-md flex items-center gap-2 transition-all transform hover:-translate-y-0.5
                      ${loadingPassword ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"}
                    `}
                  >
                    {loadingPassword ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang xử lý...
                      </>
                    ) : (
                      <>Cập Nhật Mật Khẩu</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Account;