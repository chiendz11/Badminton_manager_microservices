import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import EditableInfoCard from '../components/EditableInfoCard';

// Constants (pointsPerLevel is still needed for progress bar calculation)
const pointsPerLevel = 1000;

// Định nghĩa base URL của backend
const BACKEND_URL = "http://localhost:3000"; // Backend chạy trên port 3000

const ProfileInfoTab = ({
  user,
  editMode,
  setEditMode,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showOldPassword,
  setShowOldPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  handleChangePassword,
  handleUpdateField,
  bookingHistory,
  centerName,
  slotGroupsFromLS,
  totalAmountLS,
  navigate,
  promptCancelBooking,
  getStatusClass,
  getStatusText
}) => {
  const { setUser } = useContext(AuthContext);

  // Xử lý đường dẫn ảnh: thêm domain của backend nếu cần
  const getAvatarImagePath = (path) => {
    if (!path) return "https://placehold.co/150x150?text=Avatar";
    // Nếu đường dẫn đã là URL đầy đủ (bắt đầu bằng http), trả về nguyên gốc
    if (path.startsWith("http")) return path;
    // Nếu đường dẫn là tương đối (bắt đầu bằng /uploads), thêm domain của backend
    return `${BACKEND_URL}${path}`;
  };

  const [previewImage, setPreviewImage] = useState(getAvatarImagePath(user?.avatar_image_path));
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // Cập nhật previewImage khi user.avatar_image_path thay đổi
  useEffect(() => {
    const imagePath = getAvatarImagePath(user?.avatar_image_path);
    setPreviewImage(imagePath);
    console.log("Cập nhật ảnh đại diện:", imagePath);
  }, [user?.avatar_image_path]);

  // Xử lý khi người dùng chọn ảnh
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Kiểm tra định dạng file
      const validTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!validTypes.includes(file.type)) {
        setError("Vui lòng chọn file ảnh (JPEG, PNG, GIF)!");
        return;
      }

      // Kiểm tra kích thước file (tối đa 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError("Kích thước ảnh không được vượt quá 5MB!");
        return;
      }

      // Xóa lỗi nếu file hợp lệ
      setError("");

      // Hiển thị ảnh xem trước
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);

      // Gửi file ảnh qua handleUpdateField
      try {
        await handleUpdateField("avatar_image_path", file);
      } catch (err) {
        setError("Lỗi khi cập nhật ảnh đại diện. Vui lòng thử lại!");
        const imagePath = getAvatarImagePath(user?.avatar_image_path);
        setPreviewImage(imagePath); // Khôi phục ảnh cũ
      }
    }
  };

  // Mở file input khi nhấp vào nút "Thay đổi avatar"
  const handleChangeAvatarClick = () => {
    fileInputRef.current.click();
  };

  const userPoints = user?.points || 0;
  const currentLevelName = user?.level || "Sắt";
  const currentLevelIndex = user?.level ? ["Sắt", "Đồng", "Bạc", "Vàng", "Bạch kim"].indexOf(currentLevelName) : 0;
  const nextLevelIndex = currentLevelIndex < 4 ? currentLevelIndex + 1 : null;
  const pointsInCurrentLevel = userPoints - currentLevelIndex * pointsPerLevel;
  const progressPercentage = (pointsInCurrentLevel / pointsPerLevel) * 100;
  const pointsToNextLevel = nextLevelIndex !== null ? pointsPerLevel - pointsInCurrentLevel : 0;
  const nextLevelName = nextLevelIndex !== null ? ["Sắt", "Đồng", "Bạc", "Vàng", "Bạch kim"][nextLevelIndex] : "";
  const upcomingBookings = bookingHistory.filter(booking => booking.status === "pending");

  return (
    <div id="profile-info-tab" className="tab-content info-content">
      <div className="section-title">
        <i className="fas fa-user-edit"></i>
        <h2>Thông tin cá nhân</h2>
      </div>
      <div className="info-container">
        <div className="info-sidebar">
          <div className="profile-overview">
            <div className="profile-image-container">
              <img
                id="profile-avatar-image"
                src={previewImage}
                alt="Avatar"
                className="profile-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://placehold.co/150x150?text=Avatar";
                }}
              />
              <button
                id="change-avatar-button"
                className="change-avatar-btn"
                onClick={handleChangeAvatarClick}
                title="Thay đổi ảnh đại diện"
              >
                <i className="fas fa-camera"></i>
              </button>
              {/* Input file ẩn */}
              <input
                id="avatar-file-input"
                type="file"
                accept="image/jpeg,image/png,image/gif"
                ref={fileInputRef}
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </div>
            {error && <p id="avatar-error-message" className="text-red-500 text-sm mt-2">{error}</p>}
            <h3 id="profile-name" className="profile-name">{user?.name}</h3>
            <p id="profile-email" className="profile-email">{user?.email}</p>
            <div id="membership-badge" className="membership-badge">
              <i className="fas fa-gem"></i>
              <span>Thành viên {currentLevelName}</span>
            </div>
            <div id="progress-container" className="progress-container">
              <div className="progress-info">
                <span>Điểm thành viên ({currentLevelName})</span>
                <span>{pointsInCurrentLevel}/{pointsPerLevel}</span>
              </div>
              <div className="progress-bar">
                <div id="level-progress-bar" className="progress" style={{ width: `${progressPercentage}%` }}></div>
              </div>
              <p className="progress-note">
                {nextLevelIndex !== null
                  ? `Còn ${pointsToNextLevel} điểm để lên ${nextLevelName}`
                  : "Bạn đã đạt cấp cao nhất!"}
              </p>
            </div>
          </div>
          <div className="info-actions">
            <button
              id="edit-profile-button"
              className={`action-btn ${editMode === 'profile' ? 'primary' : 'secondary'}`}
              onClick={() => setEditMode('profile')}
            >
              <i className="fas fa-edit"></i>
              <span>Chỉnh sửa hồ sơ</span>
            </button>
            <button
              id="change-password-button"
              className={`action-btn ${editMode === 'password' ? 'primary' : 'secondary'}`}
              onClick={() => setEditMode('password')}
            >
              <i className="fas fa-key"></i>
              <span>Đổi mật khẩu</span>
            </button>
          </div>
        </div>
        <div id="profile-details-container" className="info-details-container">
          {editMode === 'password' ? (
            <div id="password-change-form" className="space-y-4 fade-in">
              <div className="info-card">
                <label htmlFor="old-password-input" className="block text-sm font-medium text-gray-700">Mật khẩu cũ</label>
                <div className="relative">
                  <input
                    id="old-password-input"
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="mt-1 block w-full border border-black rounded-md py-2 pr-12 pl-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{ overflowX: "auto", whiteSpace: "nowrap" }}
                  />
                  <button
                    id="toggle-old-password-visibility"
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-600"
                    style={{ zIndex: 10 }}
                  >
                    {showOldPassword ? <i className="fas fa-eye-slash"></i> : <i className="fas fa-eye"></i>}
                  </button>
                </div>
              </div>
              <div className="info-card">
                <label htmlFor="new-password-input" className="block text-sm font-medium text-gray-700">Mật khẩu mới</label>
                <div className="relative">
                  <input
                    id="new-password-input"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 block w-full border border-black rounded-md py-2 pr-12 pl-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{ overflowX: "auto", whiteSpace: "nowrap" }}
                  />
                  <button
                    id="toggle-new-password-visibility"
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-600"
                    style={{ zIndex: 10 }}
                  >
                    {showNewPassword ? <i className="fas fa-eye-slash"></i> : <i className="fas fa-eye"></i>}
                  </button>
                </div>
              </div>
              <div className="info-card">
                <label htmlFor="confirm-password-input" className="block text-sm font-medium text-gray-700">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <input
                    id="confirm-password-input"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full border border-black rounded-md py-2 pr-12 pl-2 focus:ring-blue-500 focus:border-blue-500"
                    style={{ overflowX: "auto", whiteSpace: "nowrap" }}
                  />
                  <button
                    id="toggle-confirm-password-visibility"
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-600"
                    style={{ zIndex: 10 }}
                  >
                    {showConfirmPassword ? <i className="fas fa-eye-slash"></i> : <i className="fas fa-eye"></i>}
                  </button>
                </div>
              </div>
              <button
                id="confirm-password-change-button"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md"
                onClick={handleChangePassword}
              >
                Xác nhận thay đổi
              </button>
            </div>
          ) : (
            <>
              <div id="basic-info-section" className="info-section">
                <h3 className="info-section-title">
                  <i className="fas fa-user"></i>
                  <span>Thông tin cơ bản</span>
                </h3>
                <div className="info-grid">
                  <EditableInfoCard
                    idPrefix="name"
                    label="Họ và tên"
                    value={user?.name}
                    onConfirm={(newValue) => handleUpdateField("name", newValue)}
                  />
                  <EditableInfoCard
                    idPrefix="phone-number"
                    label="Số điện thoại"
                    value={user?.phone_number}
                    onConfirm={(newValue) => handleUpdateField("phone_number", newValue)}
                  />
                  <EditableInfoCard
                    idPrefix="email"
                    label="Email"
                    value={user?.email}
                    onConfirm={(newValue) => handleUpdateField("email", newValue)}
                  />
                </div>
              </div>
              <div id="upcoming-bookings-section" className="upcoming-bookings">
                <div className="section-title">
                  <i className="fas fa-calendar-alt"></i>
                  <h2>Lịch đặt sắp tới</h2>
                </div>
                {upcomingBookings.length > 0 ? (
                  <div id="upcoming-bookings-grid" className="upcoming-grid">
                    {upcomingBookings.map((booking) => (
                      <div key={booking._id} id={`booking-card-${booking.orderId}`} className="upcoming-card">
                        <div className="upcoming-header">
                          <span id={`booking-id-${booking.orderId}`} className="upcoming-id">#{booking.orderId}</span>
                          <span id={`booking-status-${booking.orderId}`} className={`upcoming-status ${getStatusClass(booking.status)}`}>
                            {getStatusText(booking.status)}
                          </span>
                        </div>
                        <div className="upcoming-details">
                          <div className="upcoming-detail">
                            <i className="fas fa-map-marker-alt"></i>
                            <span id={`booking-center-${booking.orderId}`}>{centerName}</span>
                          </div>
                          <div className="upcoming-detail">
                            <i className="fas fa-table-tennis"></i>
                            <span id={`booking-court-details-${booking.orderId}`}>
                              {slotGroupsFromLS.length > 0 ? (
                                slotGroupsFromLS.map((group, idx) => (
                                  <React.Fragment key={idx}>
                                    <span>{group.courtName}: {group.timeStr}</span>
                                    {idx < slotGroupsFromLS.length - 1 && <br />}
                                  </React.Fragment>
                                ))
                              ) : (
                                booking.court
                              )}
                            </span>
                          </div>
                          <div className="upcoming-detail">
                            <i className="fas fa-calendar-day"></i>
                            <span id={`booking-date-${booking.orderId}`}>{booking.date}</span>
                          </div>
                        </div>
                        <div className="upcoming-price">
                          <span id={`booking-total-amount-${booking.orderId}`}>{totalAmountLS.toLocaleString("vi-VN")} đ</span>
                        </div>
                        <div className="upcoming-actions">
                          <button id={`pay-now-button-${booking.orderId}`} className="pay-now-btn" onClick={() => navigate("/payment")}>
                            Thanh Toán Ngay
                          </button>
                          <button
                            id={`cancel-booking-button-${booking.orderId}`}
                            className="cancel-btn"
                            onClick={() => promptCancelBooking(booking.orderId)}
                          >
                            Hủy Đặt Sân
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p id="no-upcoming-bookings-message">Không có lịch đặt sắp tới.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileInfoTab;