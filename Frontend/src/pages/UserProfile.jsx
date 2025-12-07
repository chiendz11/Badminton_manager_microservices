import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ModalConfirmation from '../components/ModalConfirmation';
import ProfileInfoTab from '../components/ProfileInfoTab';
import StatsTab from '../components/StatusTab'; 
import HistoryTab from '../components/HistoryTab';

// API cho Actions (Hủy/Xóa) và User Info
import { cancelBooking, deleteBooking } from '../apis/booking';
import { getDetailedBookingStats, getChartData } from '../apis/users';
import { updateMyProfile } from '../apiV2/user_service/rest/users.api';
import { updateUserPassword } from '../apiV2/auth_service/rest/users.api';
import { fetchUserInfo } from '../apiV2/user_service/rest/users.api';

import '../styles/UserProfile.css';

// Helper functions
const getStatusClass = (status) => {
  switch (status) {
    case 'paid': return 'status-completed';
    case 'confirmed': return 'status-completed';
    case 'pending': return 'status-pending';
    case 'cancelled': return 'status-cancelled';
    case 'processing': return 'status-processing';
    default: return '';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'paid': return 'Hoàn thành';
    case 'confirmed': return 'Hoàn thành';
    case 'pending': return 'Chờ thanh toán';
    case 'cancelled': return 'Đã hủy';
    case 'processing': return 'Đang xử lý';
    default: return '';
  }
};

const UserProfile = () => {
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  
  // Hook lấy tham số từ URL (để hỗ trợ link trực tiếp vào tab History)
  const [searchParams] = useSearchParams();

  // --- STATES ---
  
  // Logic khởi tạo activeTab: Ưu tiên URL -> LocalStorage -> Mặc định 'info'
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['info', 'stats', 'history'].includes(tabFromUrl)) {
      return tabFromUrl;
    }
    return localStorage.getItem('activeTab') || 'info';
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // State cho Modal Action (Hủy/Xóa/Thanh toán)
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionConfig, setActionConfig] = useState(null);

  // State cho Refresh Data (Trigger reload HistoryTab khi có thay đổi từ bên ngoài)
  const [refreshHistoryTrigger, setRefreshHistoryTrigger] = useState(0);

  // State cho Tab Profile Info
  const [editMode, setEditMode] = useState("profile");
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // State cho Tab Stats
  const [animateStats, setAnimateStats] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState("month");
  const [detailedStats, setDetailedStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [chartFilter, setChartFilter] = useState("all");

  // LocalStorage data
  const centerName = localStorage.getItem("centerName") || "Tên Trung Tâm Mặc Định";
  const slotGroupsFromLS = JSON.parse(localStorage.getItem("slotGroups") || "[]");
  const totalAmountLS = Number(localStorage.getItem("totalAmount")) || 0;
  const DEFAULT_AVATAR_URL = "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png";

  const getAvatarImagePath = (path) => {
    return (path && path.trim() !== "") ? path : DEFAULT_AVATAR_URL;
  };

  // --- USE EFFECTS ---

  // Khi URL thay đổi param tab (ví dụ user bấm back/forward), cập nhật state
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['info', 'stats', 'history'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Lưu activeTab vào localStorage để giữ trạng thái khi F5
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Giả lập loading ban đầu
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => setAnimateStats(true), 500);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch Stats (Chỉ khi vào tab stats)
  useEffect(() => {
    if (activeTab !== 'stats') return;
    const fetchStats = async () => {
      try {
        const data = await getDetailedBookingStats(statsPeriod);
        if (data.success) setDetailedStats(data.stats);
      } catch (error) {
        console.error("Error fetching booking stats:", error);
      }
    };
    fetchStats();
  }, [statsPeriod, activeTab]);

  // Fetch Chart (Chỉ 1 lần)
  useEffect(() => {
    const fetchChart = async () => {
      try {
        const data = await getChartData();
        if (data.success) setChartData(data.chartData);
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setLoadingChart(false);
      }
    };
    fetchChart();
  }, []);

  // --- HANDLERS: USER INFO ---

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }
    setIsUpdating(true);
    try {
      const data = await updateUserPassword({ oldPassword, newPassword, confirmPassword });
      if (data.success) {
        alert("Đổi mật khẩu thành công!");
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        setEditMode('profile');
      } else {
        alert("Đổi mật khẩu thất bại: " + data.message);
      }
    } catch (error) {
      alert("Lỗi khi đổi mật khẩu: " + (error.response?.data?.message || error.message));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateField = async (field, newValue) => {
    if (!newValue || (typeof newValue === 'string' && newValue.trim() === '')) {
      alert(`Vui lòng nhập ${field} trước khi cập nhật!`);
      return;
    }
    setIsUpdating(true);
    try {
      const payload = { [field]: newValue };
      const updatedUser = await updateMyProfile(payload);
      if (updatedUser && updatedUser.userId) {
        setUser(updatedUser);
        alert("Cập nhật thông tin thành công!");
      } else {
        alert("Cập nhật thất bại: " + (updatedUser.message || "Lỗi không xác định"));
      }
    } catch (error) {
      alert("Lỗi cập nhật: " + (error.response?.data?.message || error.message));
    } finally {
      setIsUpdating(false);
    }
  };

  // --- HANDLERS: ACTIONS (CANCEL / DELETE / PAY) ---

  const promptAction = (actionType, params) => {
    let title, message;
    switch (actionType) {
      case 'pay':
        title = 'Xác nhận thanh toán';
        message = 'Bạn có muốn chuyển đến trang thanh toán không?';
        break;
      case 'cancel':
        title = 'Xác nhận hủy đặt sân';
        message = 'Bạn có chắc chắn muốn hủy đặt sân này không?';
        break;
      case 'delete':
        title = 'Xác nhận xóa booking';
        message = 'Bạn có chắc chắn muốn xóa booking khỏi lịch sử không?';
        break;
      default:
        return;
    }
    // params chứa { bookingId, orderId, price, createdAt, ... } từ HistoryTab truyền lên
    setActionConfig({ type: actionType, ...params, title, message });
    setShowActionModal(true);
  };

  const promptCancelBooking = (orderId) => {
    promptAction('cancel', { orderId });
  };

  const handleActionModal = async (action) => {
    setShowActionModal(false);
    if (action !== 'confirm' || !actionConfig) {
      setActionConfig(null);
      return;
    }

    try {
      switch (actionConfig.type) {
        case 'pay':
          // 🚀 [CẬP NHẬT QUAN TRỌNG]: Truyền đầy đủ state sang Payment Page
          // để PaymentPage có thể tự check hạn (Client-Side Check)
          navigate('/payment', { 
            state: { 
              bookingId: actionConfig.bookingId, 
              createdAt: actionConfig.createdAt, // Dữ liệu quan trọng để check 5 phút
              total: actionConfig.price 
            } 
          });
          break;

        case 'cancel':
          await cancelBooking(actionConfig.bookingId || actionConfig.orderId);
          alert("Đã hủy đặt sân thành công!");
          const updatedUserCancel = await fetchUserInfo();
          setUser(updatedUserCancel.user);
          // Trigger HistoryTab load lại data mới nhất
          setRefreshHistoryTrigger(prev => prev + 1);
          break;

        case 'delete':
          const res = await deleteBooking(actionConfig.bookingId);
          if (res.success) {
            alert("Xóa booking thành công!");
            setRefreshHistoryTrigger(prev => prev + 1);
          } else {
            alert("Xóa thất bại: " + res.message);
          }
          break;
          
        default:
          break;
      }
    } catch (error) {
      console.error("Action error:", error);
      alert(`Lỗi thực hiện thao tác: ${error.message || "Lỗi không xác định"}`);
    } finally {
      setActionConfig(null);
    }
  };

  // --- RENDER ---

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"><div className="spinner"></div></div>
        <p>Đang tải thông tin...</p>
      </div>
    );
  }

  // Hàm chuyển tab và cập nhật URL
  const handleSwitchTab = (tabName) => {
    setActiveTab(tabName);
    // navigate(`/profile?tab=${tabName}`, { replace: true }); // Bật dòng này nếu muốn URL thay đổi khi click tab
  };

  return (
    <>
      <Header />
      <div className="relative profile-container">
        {isUpdating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 z-50 rounded-lg">
            <div className="w-12 h-12 border-4 border-t-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-white text-lg">Đang xử lý...</p>
          </div>
        )}
        
        {/* HEADER PROFILE */}
        <div className="profile-header">
          <div className="header-content">
            <div className="avatar-container">
              <img
                src={getAvatarImagePath(user?.avatar_url)}
                alt="Avatar"
                className="user-avatar"
                onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR_URL; }}
              />
              <div className="level-badge">{user?.level}</div>
            </div>
            <div className="user-info">
              <h1>{user?.name}</h1>
              <div className="user-details">
                <div className="detail-item"><i className="fas fa-phone"></i><span>{user?.phone_number}</span></div>
                <div className="detail-item"><i className="fas fa-envelope"></i><span>{user?.email}</span></div>
              </div>
            </div>
            <div className="membership-info">
              <div className="points-container">
                <div className="points-circle">
                  <span className="points-value">{user?.points}</span>
                  <span className="points-label">điểm</span>
                </div>
              </div>
              <div className="member-since">
                <span>Thành viên từ</span>
                <strong>{user?.registration_date ? new Date(user.registration_date).toLocaleDateString('vi-VN') : 'N/A'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="profile-tabs">
          <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => handleSwitchTab('info')}>
            <i className="fas fa-user"></i><span>Thông tin cá nhân</span>
          </button>
          <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => handleSwitchTab('stats')}>
            <i className="fas fa-chart-pie"></i><span>Thống kê</span>
          </button>
          <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => handleSwitchTab('history')}>
            <i className="fas fa-history"></i><span>Lịch sử đặt sân</span>
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="profile-content">
          {activeTab === 'info' && (
            <ProfileInfoTab
              user={user}
              editMode={editMode}
              setEditMode={setEditMode}
              // Password Props
              oldPassword={oldPassword} setOldPassword={setOldPassword}
              newPassword={newPassword} setNewPassword={setNewPassword}
              confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
              showOldPassword={showOldPassword} setShowOldPassword={setShowOldPassword}
              showNewPassword={showNewPassword} setShowNewPassword={setShowNewPassword}
              showConfirmPassword={showConfirmPassword} setShowConfirmPassword={setShowConfirmPassword}
              handleChangePassword={handleChangePassword}
              // Info Update Props
              handleUpdateField={handleUpdateField}
              // Display Props
              bookingHistory={[]}
              centerName={centerName}
              slotGroupsFromLS={slotGroupsFromLS}
              totalAmountLS={totalAmountLS}
              navigate={navigate}
              promptCancelBooking={promptCancelBooking}
              getStatusClass={getStatusClass}
              getStatusText={getStatusText}
            />
          )}

          {activeTab === 'stats' && (
            <StatsTab
              user={user}
              detailedStats={detailedStats}
              statsPeriod={statsPeriod}
              setStatsPeriod={setStatsPeriod}
              chartData={chartData}
              loadingChart={loadingChart}
              chartFilter={chartFilter}
              setChartFilter={setChartFilter}
              animateStats={animateStats}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              // Truyền user để HistoryTab có thể lấy userId
              user={user}
              // Key quan trọng: Khi key đổi -> HistoryTab remount -> Fetch lại data mới nhất
              key={refreshHistoryTrigger}
              
              navigate={navigate}
              promptAction={promptAction}
              getStatusClass={getStatusClass}
              getStatusText={getStatusText}
            />
          )}
        </div>
      </div>
      <Footer />
      
      {showActionModal && (
        <ModalConfirmation
          title={actionConfig?.title || 'Xác nhận thao tác'}
          message={actionConfig?.message || 'Bạn có chắc chắn muốn thực hiện thao tác này không?'}
          onAction={handleActionModal}
        />
      )}
    </>
  );
};

export default UserProfile;