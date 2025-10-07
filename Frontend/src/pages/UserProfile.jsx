import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ModalConfirmation from '../components/ModalConfirmation';
import ProfileInfoTab from '../components/ProfileInfoTab';
import StatsTab from '../components/StatusTab';
import HistoryTab from '../components/HistoryTab';
import { getBookingHistory, cancelBooking, deleteBooking } from '../apis/booking';
import { getDetailedBookingStats, getChartData, fetchUserInfo, updateUserInfo } from '../apis/users';
import '../styles/UserProfile.css';

// Helper functions
const getStatusClass = (status) => {
  switch (status) {
    case 'paid': return 'status-completed';
    case 'pending': return 'status-pending';
    case 'cancelled': return 'status-cancelled';
    case 'processing': return 'status-processing';
    default: return '';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'paid': return 'Hoàn thành';
    case 'pending': return 'Chờ thanh toán';
    case 'cancelled': return 'Đã hủy';
    case 'processing': return 'Đang xử lý';
    default: return '';
  }
};

const UserProfile = () => {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'info';
  });
  const [isLoading, setIsLoading] = useState(true);
  const [animateStats, setAnimateStats] = useState(false);
  const [editMode, setEditMode] = useState("profile");
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionConfig, setActionConfig] = useState(null);
  const [statsPeriod, setStatsPeriod] = useState("month");
  const [detailedStats, setDetailedStats] = useState(null);
  const { user, setUser } = useContext(AuthContext);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [chartFilter, setChartFilter] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCenter, setFilterCenter] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [isUpdating, setIsUpdating] = useState(false); // Loading state for updates
  const navigate = useNavigate();

  const centerName = localStorage.getItem("centerName") || "Tên Trung Tâm Mặc Định";
  const slotGroupsFromLS = JSON.parse(localStorage.getItem("slotGroups") || "[]");
  const totalAmountLS = Number(localStorage.getItem("totalAmount")) || 0;

  // Định nghĩa base URL của backend
  const BACKEND_URL = "http://localhost:3000";

  // Xử lý đường dẫn ảnh: thêm domain của backend nếu cần
  const getAvatarImagePath = (path) => {
    if (!path) return "/default-avatar.png";
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}${path}`;
  };

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (user && user._id) {
        try {
          const data = await getBookingHistory();
          console.log("Booking history response:", data);
          if (data.success) {
            setBookingHistory(data.bookingHistory);
            setFilteredHistory(data.bookingHistory);
          } else {
            console.error("Error fetching booking history:", data.message);
          }
        } catch (error) {
          console.error("Error fetching booking history:", error?.response?.data || error);
        } finally {
          setIsLoading(false);
          setTimeout(() => setAnimateStats(true), 500);
        }
      }
    };
    fetchHistory();
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDetailedBookingStats(statsPeriod);
        if (data.success) {
          setDetailedStats(data.stats);
          console.log("Detailed stats:", data.stats);
        } else {
          console.error("Error fetching booking stats:", data.message);
        }
      } catch (error) {
        console.error("Error fetching booking stats:", error);
      }
    };
    fetchStats();
  }, [statsPeriod]);

  useEffect(() => {
    const fetchChart = async () => {
      try {
        const data = await getChartData();
        if (data.success) {
          setChartData(data.chartData);
        } else {
          console.error("Error fetching chart data:", data.message);
        }
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setLoadingChart(false);
      }
    };
    fetchChart();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => setAnimateStats(true), 500);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Lắng nghe sự kiện "Quay lại" trên trình duyệt
  useEffect(() => {
    window.history.pushState(null, null, window.location.href);

    const handlePopState = (event) => {
      event.preventDefault();
      navigate('/', { replace: true });
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }
    try {
      const data = await updateUserPassword({ oldPassword, newPassword });
      if (data.success) {
        alert("Đổi mật khẩu thành công!");
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        alert("Đổi mật khẩu thất bại: " + data.message);
      }
    } catch (error) {
      alert("Lỗi khi đổi mật khẩu: " + error.message);
    }
  };

  const handleUpdateField = async (field, newValue) => {
    // Validate non-empty input
    if (!newValue || (typeof newValue === 'string' && newValue.trim() === '')) {
      alert(`Vui lòng nhập ${field === 'avatar_image_path' ? 'hình ảnh' : field} trước khi cập nhật!`);
      return;
    }

    setIsUpdating(true); // Start loading
    try {
      let payload;
      if (field === "avatar_image_path" && newValue instanceof File) {
        payload = new FormData();
        payload.append(field, newValue);
      } else {
        payload = { [field]: newValue };
      }

      const data = await updateUserInfo(payload);
      if (data.success) {
        setUser((prevUser) => ({ ...prevUser, [field]: data.user[field] }));
        alert("Cập nhật thông tin thành công!");
      } else {
        alert("Cập nhật thất bại: " + data.message);
      }
    } catch (error) {
      const errorMessage = error.message || "Lỗi không xác định khi cập nhật!";
      alert("Lỗi cập nhật: " + errorMessage);
      throw error; // Throw error for ProfileInfoTab to handle
    } finally {
      setIsUpdating(false); // Stop loading
    }
  };

  const promptCancelBooking = (orderId) => {
    setActionConfig({
      type: 'cancel',
      orderId,
      title: 'Xác nhận hủy đặt sân',
      message: 'Bạn có chắc chắn muốn hủy đặt sân này không?'
    });
    setShowActionModal(true);
  };

  const handleDelete = async (bookingId) => {
    console.log("Deleting bookingId:", bookingId);
    try {
      const response = await deleteBooking(bookingId);
      if (response.success) {
        alert("Xóa booking thành công!");
        setBookingHistory((prevHistory) => {
          const newHistory = prevHistory.filter((booking) => booking.bookingId !== bookingId);
          console.log("Updated bookingHistory:", newHistory);
          return newHistory;
        });
        setFilteredHistory((prevFiltered) => {
          const newFiltered = prevFiltered.filter((booking) => booking.bookingId !== bookingId);
          console.log("Updated filteredHistory:", newFiltered);
          return newFiltered;
        });
      } else {
        alert("Xóa booking thất bại: " + response.message);
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
      alert("Lỗi khi xóa booking: " + error.message);
    }
  };

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
        message = 'Bạn có chắc chắn muốn xóa booking này không?';
        break;
      default:
        return;
    }
    setActionConfig({ type: actionType, ...params, title, message });
    setShowActionModal(true);
  };

  const handleActionModal = async (action) => {
    setShowActionModal(false);
    if (action === 'confirm' && actionConfig) {
      switch (actionConfig.type) {
        case 'pay':
          navigate('/payment');
          break;
        case 'cancel':
          try {
            await cancelBooking();
            alert("Đã hủy pending booking thành công!");
            setBookingHistory((prevHistory) =>
              prevHistory.filter((booking) => booking.orderId !== actionConfig.orderId)
            );
            setFilteredHistory((prevFiltered) =>
              prevFiltered.filter((booking) => booking.orderId !== actionConfig.orderId)
            );
            const updatedUserData = await fetchUserInfo();
            setUser(updatedUserData.user);
          } catch (error) {
            alert("Lỗi khi hủy đặt sân: " + error.message);
          }
          break;
        case 'delete':
          await handleDelete(actionConfig.bookingId);
          break;
        default:
          break;
      }
    }
    setActionConfig(null);
  };

  const handleFilter = () => {
    const filtered = bookingHistory.filter(item => {
      const statusMatch = filterStatus === "all" || item.status === filterStatus;
      const centerMatch = filterCenter === "all" || item.center.toLowerCase().includes(filterCenter.toLowerCase());
      const searchMatch =
        filterSearch === "" ||
        (item.orderId && item.orderId.toLowerCase().includes(filterSearch.toLowerCase())) ||
        (item.court_time && item.court_time.toLowerCase().includes(filterSearch.toLowerCase()));
      const itemDate = new Date(item.date);
      let dateMatch = true;
      if (filterFrom) {
        dateMatch = dateMatch && (itemDate >= new Date(filterFrom));
      }
      if (filterTo) {
        dateMatch = dateMatch && (itemDate <= new Date(filterTo));
      }
      return statusMatch && centerMatch && searchMatch && dateMatch;
    });
    setFilteredHistory(filtered);
  };

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <p>Đang tải thông tin...</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="relative profile-container">
        {isUpdating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="w-12 h-12 border-4 border-t-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-white text-lg">Đang cập nhật thông tin...</p>
          </div>
        )}
        <div className="profile-header">
          <div className="header-content">
            <div className="avatar-container">
              <img
                src={getAvatarImagePath(user?.avatar_image_path)}
                alt="Avatar"
                className="user-avatar"
                onError={(e) => {
                  console.log("Lỗi tải ảnh trong UserProfile:", user?.avatar_image_path);
                  e.target.onerror = null;
                  e.target.src = "/default-avatar.png";
                }}
              />
              <div className="level-badge">{user?.level}</div>
            </div>
            <div className="user-info">
              <h1>{user?.name}</h1>
              <div className="user-details">
                <div className="detail-item">
                  <i className="fas fa-phone"></i>
                  <span>{user?.phone_number}</span>
                </div>
                <div className="detail-item">
                  <i className="fas fa-envelope"></i>
                  <span>{user?.email}</span>
                </div>
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
                <strong>{new Date(user?.registration_date).toLocaleDateString('vi-VN')}</strong>
              </div>
            </div>
          </div>
        </div>
        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <i className="fas fa-user"></i>
            <span>Thông tin cá nhân</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <i className="fas fa-chart-pie"></i>
            <span>Thống kê</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <i className="fas fa-history"></i>
            <span>Lịch sử đặt sân</span>
          </button>
        </div>
        <div className="profile-content">
          {activeTab === 'info' && (
            <ProfileInfoTab
              user={user}
              editMode={editMode}
              setEditMode={setEditMode}
              oldPassword={oldPassword}
              setOldPassword={setOldPassword}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              showOldPassword={showOldPassword}
              setShowOldPassword={setShowOldPassword}
              showNewPassword={showNewPassword}
              setShowNewPassword={setShowNewPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              handleChangePassword={handleChangePassword}
              handleUpdateField={handleUpdateField}
              bookingHistory={bookingHistory}
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
              bookingHistory={bookingHistory}
              filteredHistory={filteredHistory}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterCenter={filterCenter}
              setFilterCenter={setFilterCenter}
              filterFrom={filterFrom}
              setFilterFrom={setFilterFrom}
              filterTo={filterTo}
              setFilterTo={setFilterTo}
              filterSearch={filterSearch}
              setFilterSearch={setFilterSearch}
              handleFilter={handleFilter}
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