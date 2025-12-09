// src/pages/UserProfile.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ModalConfirmation from '../components/ModalConfirmation';
import ProfileInfoTab from '../components/ProfileInfoTab';
import StatsTab from '../components/StatusTab'; 
import HistoryTab from '../components/HistoryTab';

// --- [TAB CŨ] ---
import FriendsTab from '../components/FriendsTab.jsx'; // Chat
import FindFriendsTab from '../components/FindFriendsTab.jsx'; // Tìm bạn

// --- [NEW - TAB MỚI] ---
import OtherInfoTab from '../components/OtherInfoTab.jsx'; // Thông tin bổ sung (Meilisearch)
import FriendManagementTab from '../components/FriendManagementTab.jsx'; // Quản lý bạn bè/Lời mời

// API & Styles
import { cancelBooking, deleteBooking } from '../apis/booking';
import { getDetailedBookingStats, getChartData } from '../apis/users';
import { updateMyProfile } from '../apiV2/user_service/rest/users.api';
import { updateUserPassword } from '../apiV2/auth_service/rest/users.api';
import { fetchUserInfo } from '../apiV2/user_service/rest/users.api';
import '../styles/UserProfile.css';

// ... (Giữ nguyên helper getStatusClass, getStatusText) ...
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
  const [searchParams] = useSearchParams();

  // --- STATES ---
  // [UPDATE] Thêm 'other-info' và 'friends-manage' vào danh sách tab hợp lệ
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    const validTabs = ['info', 'stats', 'history', 'friends', 'find', 'other-info', 'friends-manage'];
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      return tabFromUrl;
    }
    return localStorage.getItem('activeTab') || 'info';
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionConfig, setActionConfig] = useState(null);
  const [refreshHistoryTrigger, setRefreshHistoryTrigger] = useState(0);

  // States cho Profile Info & Password (giữ nguyên)
  const [editMode, setEditMode] = useState("profile");
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States cho Stats (giữ nguyên)
  const [animateStats, setAnimateStats] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState("month");
  const [detailedStats, setDetailedStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [chartFilter, setChartFilter] = useState("all");

  const centerName = localStorage.getItem("centerName") || "Tên Trung Tâm Mặc Định";
  const slotGroupsFromLS = JSON.parse(localStorage.getItem("slotGroups") || "[]");
  const totalAmountLS = Number(localStorage.getItem("totalAmount")) || 0;
  const DEFAULT_AVATAR_URL = "https://res.cloudinary.com/dm4uxmmtg/image/upload/v1762859721/badminton_app/avatars/default_user_avatar.png";

  const getAvatarImagePath = (path) => (path && path.trim() !== "") ? path : DEFAULT_AVATAR_URL;

  // --- USE EFFECTS (Giữ nguyên) ---
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const validTabs = ['info', 'stats', 'history', 'friends', 'find', 'other-info', 'friends-manage'];
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => setAnimateStats(true), 500);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (activeTab !== 'stats') return;
    const fetchStats = async () => {
      try {
        const data = await getDetailedBookingStats(statsPeriod);
        if (data.success) setDetailedStats(data.stats);
      } catch (error) { console.error("Error stats:", error); }
    };
    fetchStats();
  }, [statsPeriod, activeTab]);

  useEffect(() => {
    const fetchChart = async () => {
      try {
        const data = await getChartData();
        if (data.success) setChartData(data.chartData);
      } catch (error) { console.error("Error chart:", error); }
      finally { setLoadingChart(false); }
    };
    fetchChart();
  }, []);

  // --- HANDLERS (Update Profile, Password, Modal Action...) Giữ nguyên ---
  const handleChangePassword = async () => { /* ... Logic cũ ... */ };
  const handleUpdateField = async (field, newValue) => { /* ... Logic cũ ... */ };
  const promptAction = (actionType, params) => {
    let title, message;
    switch (actionType) {
      case 'pay': title = 'Xác nhận thanh toán'; message = 'Đến trang thanh toán?'; break;
      case 'cancel': title = 'Hủy đặt sân'; message = 'Bạn chắc chắn muốn hủy?'; break;
      case 'delete': title = 'Xóa booking'; message = 'Xóa khỏi lịch sử?'; break;
      default: return;
    }
    setActionConfig({ type: actionType, ...params, title, message });
    setShowActionModal(true);
  };
  const promptCancelBooking = (orderId) => promptAction('cancel', { orderId });
  
  const handleActionModal = async (action) => {
    setShowActionModal(false);
    if (action !== 'confirm' || !actionConfig) { setActionConfig(null); return; }
    try {
      if (actionConfig.type === 'pay') {
        navigate('/payment', { state: { bookingId: actionConfig.bookingId, createdAt: actionConfig.createdAt, total: actionConfig.price } });
      } else if (actionConfig.type === 'cancel') {
        await cancelBooking(actionConfig.bookingId || actionConfig.orderId);
        alert("Đã hủy thành công!");
        const u = await fetchUserInfo(); setUser(u.user);
        setRefreshHistoryTrigger(prev => prev + 1);
      } else if (actionConfig.type === 'delete') {
        await deleteBooking(actionConfig.bookingId);
        alert("Đã xóa!");
        setRefreshHistoryTrigger(prev => prev + 1);
      }
    } catch (error) { alert("Lỗi: " + error.message); }
    finally { setActionConfig(null); }
  };

  if (isLoading) return <div className="profile-loading"><div className="spinner"></div><p>Loading...</p></div>;

  const handleSwitchTab = (tabName) => setActiveTab(tabName);

  return (
    <>
      <Header />
      <div className="relative profile-container">
        {isUpdating && <div className="loading-overlay"><div className="spinner"></div></div>}
        
        {/* PROFILE HEADER (Giữ nguyên) */}
        <div className="profile-header">
          <div className="header-content">
            <div className="avatar-container">
              <img src={getAvatarImagePath(user?.avatar_url)} alt="Avatar" className="user-avatar" onError={(e) => {e.target.onerror=null;e.target.src=DEFAULT_AVATAR_URL}} />
              <div className="level-badge">{user?.level}</div>
            </div>
            <div className="user-info">
              <h1>{user?.name}</h1>
              <div className="user-details">
                <div><i className="fas fa-phone"></i> {user?.phone_number}</div>
                <div><i className="fas fa-envelope"></i> {user?.email}</div>
              </div>
            </div>
            <div className="membership-info">
              <div className="points-container"><span className="points-value">{user?.points}</span> điểm</div>
            </div>
          </div>
        </div>

        {/* --- [UPDATE] TABS NAVIGATION --- */}
        <div className="profile-tabs">
          <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => handleSwitchTab('info')}>
            <i className="fas fa-user"></i><span>Thông tin</span>
          </button>
          
          {/* [NEW] Tab Thông tin khác (Meilisearch) */}
          <button className={`tab-btn ${activeTab === 'other-info' ? 'active' : ''}`} onClick={() => handleSwitchTab('other-info')}>
            <i className="fas fa-id-card"></i><span>Hồ sơ mở rộng</span>
          </button>

          <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => handleSwitchTab('stats')}>
            <i className="fas fa-chart-pie"></i><span>Thống kê</span>
          </button>
          <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => handleSwitchTab('history')}>
            <i className="fas fa-history"></i><span>Lịch sử</span>
          </button>

          {/* [NEW] Tab Quản lý bạn bè */}
          <button className={`tab-btn ${activeTab === 'friends-manage' ? 'active' : ''}`} onClick={() => handleSwitchTab('friends-manage')}>
            <i className="fas fa-user-friends"></i><span>Bạn bè</span>
          </button>

          <button className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => handleSwitchTab('friends')}>
            <i className="fas fa-comment-dots"></i><span>Tin nhắn</span>
          </button>
          <button className={`tab-btn ${activeTab === 'find' ? 'active' : ''}`} onClick={() => handleSwitchTab('find')}>
            <i className="fas fa-search-plus"></i><span>Tìm bạn</span>
          </button>
        </div>

        {/* --- TAB CONTENT --- */}
        <div className="profile-content">
          {activeTab === 'info' && (
            <ProfileInfoTab 
               user={user} editMode={editMode} setEditMode={setEditMode}
               oldPassword={oldPassword} setOldPassword={setOldPassword}
               newPassword={newPassword} setNewPassword={setNewPassword}
               confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
               showOldPassword={showOldPassword} setShowOldPassword={setShowOldPassword}
               showNewPassword={showNewPassword} setShowNewPassword={setShowNewPassword}
               showConfirmPassword={showConfirmPassword} setShowConfirmPassword={setShowConfirmPassword}
               handleChangePassword={handleChangePassword} handleUpdateField={handleUpdateField}
               bookingHistory={[]} centerName={centerName} slotGroupsFromLS={slotGroupsFromLS}
               totalAmountLS={totalAmountLS} navigate={navigate} promptCancelBooking={promptCancelBooking}
               getStatusClass={getStatusClass} getStatusText={getStatusText}
            />
          )}

          {/* [NEW] Tab Thông tin mở rộng */}
          {activeTab === 'other-info' && <OtherInfoTab user={user} onUpdate={handleUpdateField} />}

          {/* [NEW] Tab Quản lý bạn bè */}
          {activeTab === 'friends-manage' && <FriendManagementTab user={user} />}

          {activeTab === 'stats' && (
            <StatsTab user={user} detailedStats={detailedStats} statsPeriod={statsPeriod} setStatsPeriod={setStatsPeriod} chartData={chartData} loadingChart={loadingChart} chartFilter={chartFilter} setChartFilter={setChartFilter} animateStats={animateStats} />
          )}

          {activeTab === 'history' && (
            <HistoryTab user={user} key={refreshHistoryTrigger} navigate={navigate} promptAction={promptAction} getStatusClass={getStatusClass} getStatusText={getStatusText} />
          )}

          {activeTab === 'friends' && <FriendsTab currentUser={user} />}
          {activeTab === 'find' && <FindFriendsTab currentUser={user} />}
        </div>
      </div>
      <Footer />
      {showActionModal && <ModalConfirmation title={actionConfig?.title} message={actionConfig?.message} onAction={handleActionModal} />}
    </>
  );
};

export default UserProfile;