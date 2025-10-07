import React from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardAdmin = () => {
  const navigate = useNavigate();

  const goToCenter = () => navigate('/center-status');
  const goToUsers = () => navigate('/users-manage');
  const goToNews = () => navigate('/news');
  const goToBooking = () => navigate('/admin-bill-list');
  const goToRating = () => navigate('/ratings');
  const goToAccount = () => navigate('/account');
  const goToShop = () => navigate('/shop');
  const goToStock = () => navigate('/stock');
  const goToReport = () => navigate('/report');
  const handleLogout = () => navigate('/login');

  const features = [
    { title: 'Xem trạng thái sân', onClick: goToCenter, color: '#F8B400' },
    { title: 'Bán hàng', onClick: goToShop, color: '#FFB347' },
    { title: 'Quản lý tin tức', onClick: goToNews, color: '#EC6EAD' },
    { title: 'Quản lý đánh giá', onClick: goToRating, color: '#C94B4B' },
    { title: 'Quản lý kho', onClick: goToStock, color: '#4DA8DA' },
    { title: 'Báo cáo doanh thu', onClick: goToReport, color: '#FF7F50' }, // ✅ Thêm dòng này
    { title: 'Quản lý khách hàng', onClick: goToUsers, color: '#5CB85C' },
    { title: 'Quản lý đơn', onClick: goToBooking, color: '#9370DB' },
    { title: 'Quản lý Tài khoản', onClick: goToAccount, color: '#7B68EE' },
  ];

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#E9F5E9', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <img src="https://cdn-icons-png.flaticon.com/512/124/124902.png" alt="avatar" style={{ width: 60, borderRadius: '50%' }} />
        <h2 style={{ fontSize: '2.5em', fontFamily: 'Roboto, sans-serif' }}>Quản lý trung tâm của bạn</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        {features.map((item, index) => (
          <div
            key={index}
            onClick={item.onClick}
            style={{
              background: item.color,
              padding: '30px',
              borderRadius: '15px',
              textAlign: 'center',
              cursor: 'pointer',
              color: 'white',
              fontWeight: 'bold',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            {item.title}
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#FF4B5C', border: 'none', borderRadius: '8px', color: '#fff' }}>
          Đăng xuất
        </button>
      </div>
    </div>
  );
};

export default DashboardAdmin;
